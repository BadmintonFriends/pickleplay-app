CREATE TABLE `bracket_settings` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `tournamentId` int NOT NULL,
  `tournamentEventId` int NOT NULL,
  `qualifyingScore` int NOT NULL DEFAULT 15,
  `mainScore` int NOT NULL DEFAULT 15,
  `deuceEnabled` boolean NOT NULL DEFAULT true,
  `deuceMaxScore` int NOT NULL DEFAULT 17,
  `advanceCount` int NOT NULL DEFAULT 1,
  `hasThirdPlace` boolean NOT NULL DEFAULT false,
  `eventOrder` int NOT NULL DEFAULT 0,
  `matchDate` varchar(10),
  `status` enum('draft','qualifying','main','completed') NOT NULL DEFAULT 'draft',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_tournament_event` (`tournamentId`, `tournamentEventId`)
);

CREATE TABLE `bracket_court_settings` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `tournamentId` int NOT NULL,
  `matchDate` varchar(10) NOT NULL,
  `courtCount` int NOT NULL DEFAULT 1,
  `startTime` varchar(5) NOT NULL DEFAULT '09:00',
  `estimatedMinutes` int NOT NULL DEFAULT 15,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  UNIQUE KEY `uq_tournament_date` (`tournamentId`, `matchDate`)
);

CREATE TABLE `bracket_groups` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `tournamentId` int NOT NULL,
  `tournamentEventId` int NOT NULL,
  `groupNumber` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  UNIQUE KEY `uq_event_group` (`tournamentEventId`, `groupNumber`)
);

CREATE TABLE `bracket_group_teams` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `groupId` int NOT NULL,
  `registrationId` int NOT NULL,
  `finalRank` int,
  `createdAt` timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE `bracket_matches` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `tournamentId` int NOT NULL,
  `tournamentEventId` int NOT NULL,
  `phase` enum('qualifying','main') NOT NULL,
  `roundNumber` int NOT NULL DEFAULT 1,
  `matchNumber` int NOT NULL,
  `groupId` int,
  `team1Id` int,
  `team2Id` int,
  `team1Score` int,
  `team2Score` int,
  `winnerId` int,
  `isBye` boolean NOT NULL DEFAULT false,
  `courtNumber` int,
  `scheduledAt` datetime,
  `team1SourceType` enum('group_rank','match_winner'),
  `team1SourceGroupId` int,
  `team1SourceRank` int,
  `team1SourceMatchId` int,
  `team2SourceType` enum('group_rank','match_winner'),
  `team2SourceGroupId` int,
  `team2SourceRank` int,
  `team2SourceMatchId` int,
  `nextMatchId` int,
  `nextMatchPosition` int,
  `loserNextMatchId` int,
  `loserNextMatchPosition` int,
  `status` enum('scheduled','completed') NOT NULL DEFAULT 'scheduled',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
