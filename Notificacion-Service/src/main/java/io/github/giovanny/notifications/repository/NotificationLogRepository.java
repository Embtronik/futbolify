package io.github.giovanny.notifications.repository;

import io.github.giovanny.notifications.domain.entity.NotificationLog;
import io.github.giovanny.notifications.domain.enums.Channel;
import io.github.giovanny.notifications.domain.enums.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationLogRepository extends JpaRepository<NotificationLog, UUID> {
    
    List<NotificationLog> findByRecipient(String recipient);
    
    List<NotificationLog> findByStatus(NotificationStatus status);
    
    List<NotificationLog> findByChannel(Channel channel);
    
    List<NotificationLog> findByRecipientAndChannel(String recipient, Channel channel);
    
    @Query("SELECT n FROM NotificationLog n WHERE n.status = :status AND n.createdAt >= :since")
    List<NotificationLog> findByStatusSince(
            @Param("status") NotificationStatus status, 
            @Param("since") LocalDateTime since
    );
    
    @Query("SELECT n FROM NotificationLog n WHERE n.recipient = :recipient ORDER BY n.createdAt DESC")
    List<NotificationLog> findByRecipientOrderByCreatedAtDesc(@Param("recipient") String recipient);
    
    @Query("SELECT COUNT(n) FROM NotificationLog n WHERE n.status = :status AND n.createdAt >= :since")
    long countByStatusSince(
            @Param("status") NotificationStatus status, 
            @Param("since") LocalDateTime since
    );
}
