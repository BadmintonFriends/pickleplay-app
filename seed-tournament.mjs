import 'dotenv/config';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function seed() {
  const conn = await mysql.createConnection(DATABASE_URL);

  try {
    // Check if tournament already exists
    const [existing] = await conn.execute(
      "SELECT id FROM tournaments WHERE name = ?",
      ["리닝코리아 포항 전국 피클볼 대회"]
    );
    if (existing.length > 0) {
      console.log("Tournament already exists, id:", existing[0].id);
      await conn.end();
      return;
    }

    // 1. Insert Tournament
    const organizerInfo = JSON.stringify({
      hosts: ["리닝코리아", "포항 전국 피클볼 조직 위원회"],
      sponsors: ["포항시 체육회", "대한피클볼 협회", "포항시 피클볼 협회", "포항 피클볼 클럽"],
    });

    const sizeOptions = JSON.stringify([
      "85", "90", "95", "100", "105", "110"
    ]);

    const [tournamentResult] = await conn.execute(
      `INSERT INTO tournaments (name, description, startDate, endDate, venue, address, organizerInfo, feePerTeam, giftDescription, sizeType, sizeOptions, hasAgeGroup, hasSingles, bankName, accountNumber, accountHolder, paymentNote, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "리닝코리아 포항 전국 피클볼 대회",
        "리닝코리아와 포항 전국 피클볼 조직 위원회가 주최하는 전국 규모 피클볼 대회입니다. 포항시 체육회, 대한피클볼 협회, 포항시 피클볼 협회, 포항 피클볼 클럽이 후원합니다.",
        "2026-06-14",
        "2026-06-14",
        "만인당실내체육관",
        "경북 포항시 남구 희망대로 814",
        organizerInfo,
        30000, // 참가비 3만원 (예시)
        "대회 참가 기념 티셔츠",
        "numeric",
        sizeOptions,
        false, // 연령 구분 없음
        true,  // 단식 종목 포함
        "국민은행",
        "123-456-789012",
        "포항피클볼조직위원회",
        "참가비 입금 시 선수명으로 입금해주세요",
        "open", // 접수 오픈 상태
      ]
    );

    const tournamentId = tournamentResult.insertId;
    console.log("Tournament created, id:", tournamentId);

    // 2. Insert Tournament Events (종목/급수 조합)
    // 공문 기반 종목 구성
    const events = [
      // 남자복식
      { eventType: "남복", skillLevel: "오픈부", maxTeams: 32 },
      { eventType: "남복", skillLevel: "2부", maxTeams: 32 },
      { eventType: "남복", skillLevel: "3부", maxTeams: 32 },
      { eventType: "남복", skillLevel: "신인부", maxTeams: 32 },
      // 여자복식
      { eventType: "여복", skillLevel: "오픈부", maxTeams: 24 },
      { eventType: "여복", skillLevel: "2부", maxTeams: 24 },
      { eventType: "여복", skillLevel: "3부", maxTeams: 24 },
      // 혼합복식
      { eventType: "혼복", skillLevel: "오픈부", maxTeams: 24 },
      { eventType: "혼복", skillLevel: "2부", maxTeams: 24 },
      { eventType: "혼복", skillLevel: "3부", maxTeams: 24 },
      // 남자단식
      { eventType: "남단", skillLevel: "오픈부", maxTeams: 16 },
      // 여자단식
      { eventType: "여단", skillLevel: "오픈부", maxTeams: 16 },
    ];

    for (const event of events) {
      await conn.execute(
        `INSERT INTO tournament_events (tournamentId, eventType, skillLevel, maxTeams) VALUES (?, ?, ?, ?)`,
        [tournamentId, event.eventType, event.skillLevel, event.maxTeams]
      );
    }
    console.log(`${events.length} events created`);

    console.log("Seed completed successfully!");
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    await conn.end();
  }
}

seed();
