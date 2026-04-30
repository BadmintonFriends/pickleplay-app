/**
 * Backfill script: tournaments.organizerId → tournament_organizers
 * 
 * 기존 tournaments.organizerId가 설정된 행을 tournament_organizers 테이블에
 * role='owner'로 이관합니다.
 * 
 * 실행: node scripts/backfill-organizers.mjs
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const connection = await mysql.createConnection(dbUrl);
  
  try {
    // 1. tournaments.organizerId가 있는 행 조회
    const [tournaments] = await connection.execute(
      'SELECT id, organizerId FROM tournaments WHERE organizerId IS NOT NULL'
    );

    console.log(`[Backfill] ${tournaments.length}개 대회에 organizerId가 설정되어 있습니다.`);

    let inserted = 0;
    let skipped = 0;

    for (const t of tournaments) {
      // 2. 이미 tournament_organizers에 등록되어 있는지 확인
      const [existing] = await connection.execute(
        'SELECT id FROM tournament_organizers WHERE tournamentId = ? AND userId = ?',
        [t.id, t.organizerId]
      );

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // 3. tournament_organizers에 owner로 추가
      await connection.execute(
        'INSERT INTO tournament_organizers (tournamentId, userId, role) VALUES (?, ?, ?)',
        [t.id, t.organizerId, 'owner']
      );
      inserted++;
    }

    console.log(`[Backfill] 완료: ${inserted}건 추가, ${skipped}건 이미 존재하여 건너뜀`);

    // 4. 기존 users.role = 'organizer'인 사용자를 'user'로 변경 (이미 enum에서 제거했으므로 해당 없을 수 있음)
    const [orgUsers] = await connection.execute(
      "SELECT id, name FROM users WHERE role = 'organizer'"
    );
    
    if (orgUsers.length > 0) {
      await connection.execute("UPDATE users SET role = 'user' WHERE role = 'organizer'");
      console.log(`[Backfill] ${orgUsers.length}명의 organizer 사용자를 user로 변경했습니다.`);
    } else {
      console.log('[Backfill] organizer 역할 사용자 없음 (이미 처리됨)');
    }

  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error('[Backfill] 오류:', err);
  process.exit(1);
});
