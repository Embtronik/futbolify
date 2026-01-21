package com.teamsservice.service;

import com.teamsservice.config.PollaScoringProperties;

public final class PollaPointsCalculator {

    private PollaPointsCalculator() {
    }

    public static int calculate(Integer predictedHome, Integer predictedAway,
                                Integer actualHome, Integer actualAway,
                                PollaScoringProperties rules) {
        if (predictedHome == null || predictedAway == null || actualHome == null || actualAway == null) {
            return 0;
        }

        boolean exact = predictedHome.equals(actualHome) && predictedAway.equals(actualAway);

        int scorePoints;
        if (exact) {
            scorePoints = rules.getExactScorePoints();
        } else {
            scorePoints = 0;
            if (predictedHome.equals(actualHome)) {
                scorePoints += rules.getCorrectHomeGoalsPoints();
            }
            if (predictedAway.equals(actualAway)) {
                scorePoints += rules.getCorrectAwayGoalsPoints();
            }
        }

        int winnerPoints = isSameOutcome(predictedHome, predictedAway, actualHome, actualAway)
                ? rules.getCorrectWinnerPoints()
                : 0;

        return scorePoints + winnerPoints;
    }

    private static boolean isSameOutcome(int predictedHome, int predictedAway, int actualHome, int actualAway) {
        int predictedDiff = Integer.compare(predictedHome, predictedAway);
        int actualDiff = Integer.compare(actualHome, actualAway);
        return predictedDiff == actualDiff;
    }
}
