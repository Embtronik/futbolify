package com.teamsservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.polla.scoring")
@Data
public class PollaScoringProperties {

    /** +1 por acertar goles del local (solo si NO fue marcador exacto) */
    private int correctHomeGoalsPoints = 1;

    /** +1 por acertar goles del visitante (solo si NO fue marcador exacto) */
    private int correctAwayGoalsPoints = 1;

    /** +3 por acertar marcador completo (exacto). No acumula los +1/+1 */
    private int exactScorePoints = 3;

    /** +3 por acertar ganador/empate */
    private int correctWinnerPoints = 3;
}
