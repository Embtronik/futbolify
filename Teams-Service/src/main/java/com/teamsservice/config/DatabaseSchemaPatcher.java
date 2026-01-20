package com.teamsservice.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

/**
 * Small, safe schema patcher for dev environments.
 *
 * Fixes cases where the running code expects new columns but the existing PostgreSQL schema
 * has not been updated (e.g., because ddl-auto didn't run on an already-provisioned DB).
 */
@Component
@Profile("!test")
public class DatabaseSchemaPatcher implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSchemaPatcher.class);

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    public DatabaseSchemaPatcher(JdbcTemplate jdbcTemplate, DataSource dataSource) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        String jdbcUrl = getJdbcUrlSafely();
        if (jdbcUrl == null || !jdbcUrl.startsWith("jdbc:postgresql:")) {
            return;
        }

        // Column expected by TeamMatch mapping; some DBs might be missing it.
        ensureColumnExists("team_matches", "finished",
                "ALTER TABLE team_matches ADD COLUMN IF NOT EXISTS finished boolean DEFAULT false");

        // If the column exists but is nullable/has nulls (or was created without a default), fix it up.
        // Order matters: backfill NULLs first, then set default, then enforce NOT NULL.
        ensureColumnNotNullWithDefaultFalse("team_matches", "finished");
    }

    private void ensureColumnExists(String tableName, String columnName, String alterSql) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(1) FROM information_schema.columns WHERE table_schema='public' AND table_name=? AND column_name=?",
                    Integer.class,
                    tableName,
                    columnName);

            if (count != null && count > 0) {
                return;
            }

            log.warn("Patching DB schema: adding missing column {}.{}", tableName, columnName);
            jdbcTemplate.execute(alterSql);
            log.info("DB schema patched: column {}.{} added", tableName, columnName);
        } catch (Exception e) {
            // Never fail startup because of this. Log and continue.
            log.error("DB schema patch failed for {}.{}", tableName, columnName, e);
        }
    }

    private String getJdbcUrlSafely() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.getMetaData().getURL();
        } catch (Exception e) {
            return null;
        }
    }

    private void ensureColumnNotNullWithDefaultFalse(String tableName, String columnName) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(1) FROM information_schema.columns WHERE table_schema='public' AND table_name=? AND column_name=?",
                    Integer.class,
                    tableName,
                    columnName);

            if (count == null || count == 0) {
                return;
            }

            jdbcTemplate.execute("UPDATE " + tableName + " SET " + columnName + " = false WHERE " + columnName + " IS NULL");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ALTER COLUMN " + columnName + " SET DEFAULT false");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ALTER COLUMN " + columnName + " SET NOT NULL");
        } catch (Exception e) {
            // Never fail startup because of this. Log and continue.
            log.error("DB schema patch failed while enforcing NOT NULL/DEFAULT for {}.{}", tableName, columnName, e);
        }
    }
}
