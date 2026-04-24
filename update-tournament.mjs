import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // 1. 대회 기본 정보 업데이트
  await conn.query(`
    UPDATE tournaments SET
      startDate = '2026-06-13',
      endDate = '2026-06-14',
      feePerTeam = 60000,
      registrationStart = '2026-05-01 03:00:00',
      registrationEnd = '2026-06-01 07:00:00',
      officialDocUrl = 'https://synonymous-juice-577.notion.site/32a8068b7ea4804eb7f9ebf490b5fbc6',
      organizerInfo = '{"hosts":["리닝코리아","포항 전국 피클볼 조직 위원회"],"sponsors":["포항시 체육회","대한피클볼 협회","포항시 피클볼 협회","포항 피클볼 클럽","아미노바이탈(aminoVITAL)"]}',
      giftDescription = '티셔츠 + 아미노 바이탈 영양제',
      description = '리닝코리아와 포항 전국 피클볼 조직 위원회가 주최하는 전국 규모 피클볼 대회입니다. 1일차(6/13 토)에는 오픈부와 3부, 2일차(6/14 일)에는 2부와 신인부 경기가 진행됩니다.'
    WHERE id = 1
  `);
  console.log('✅ Tournament basic info updated');

  // 2. 기존 이벤트 삭제 (단식 포함 - 공문에 단식 없음)
  // 먼저 기존 등록이 있는지 확인
  const [regs] = await conn.query('SELECT COUNT(*) as cnt FROM registrations WHERE tournamentId = 1');
  console.log('Existing registrations:', regs[0].cnt);

  // 기존 이벤트 업데이트 - maxTeams를 40으로, dayLabel 추가
  // 남복 (id 1-4)
  await conn.query("UPDATE tournament_events SET maxTeams = 40, dayLabel = '1일차 (6/13 토)' WHERE id = 1"); // 남복 오픈부
  await conn.query("UPDATE tournament_events SET maxTeams = 40, dayLabel = '2일차 (6/14 일)' WHERE id = 2"); // 남복 2부
  await conn.query("UPDATE tournament_events SET maxTeams = 40, dayLabel = '1일차 (6/13 토)' WHERE id = 3"); // 남복 3부
  await conn.query("UPDATE tournament_events SET maxTeams = 40, dayLabel = '2일차 (6/14 일)' WHERE id = 4"); // 남복 신인부
  console.log('✅ 남복 events updated');

  // 여복 (id 5-7) - 신인부 추가 필요
  await conn.query("UPDATE tournament_events SET maxTeams = 40, dayLabel = '1일차 (6/13 토)' WHERE id = 5"); // 여복 오픈부
  await conn.query("UPDATE tournament_events SET maxTeams = 40, dayLabel = '2일차 (6/14 일)' WHERE id = 6"); // 여복 2부
  await conn.query("UPDATE tournament_events SET maxTeams = 40, dayLabel = '1일차 (6/13 토)' WHERE id = 7"); // 여복 3부
  console.log('✅ 여복 events updated');

  // 혼복 (id 8-10) - 신인부 추가 필요
  await conn.query("UPDATE tournament_events SET maxTeams = 40, dayLabel = '1일차 (6/13 토)' WHERE id = 8"); // 혼복 오픈부
  await conn.query("UPDATE tournament_events SET maxTeams = 40, dayLabel = '2일차 (6/14 일)' WHERE id = 9"); // 혼복 2부
  await conn.query("UPDATE tournament_events SET maxTeams = 40, dayLabel = '1일차 (6/13 토)' WHERE id = 10"); // 혼복 3부
  console.log('✅ 혼복 events updated');

  // 단식 이벤트 삭제 (공문에 없음) - 등록이 없는 경우만
  const [singlesRegs] = await conn.query('SELECT COUNT(*) as cnt FROM registrations WHERE tournamentEventId IN (11, 12)');
  if (singlesRegs[0].cnt === 0) {
    await conn.query("DELETE FROM tournament_events WHERE id IN (11, 12)");
    console.log('✅ Singles events deleted (남단, 여단)');
  } else {
    console.log('⚠️ Singles events have registrations, skipping delete');
  }

  // 여복 신인부 추가
  await conn.query(`
    INSERT INTO tournament_events (tournamentId, eventType, skillLevel, maxTeams, dayLabel, currentTeams)
    VALUES (1, '여복', '신인부', 40, '2일차 (6/14 일)', 0)
  `);
  console.log('✅ 여복 신인부 added');

  // 혼복 신인부 추가
  await conn.query(`
    INSERT INTO tournament_events (tournamentId, eventType, skillLevel, maxTeams, dayLabel, currentTeams)
    VALUES (1, '혼복', '신인부', 40, '2일차 (6/14 일)', 0)
  `);
  console.log('✅ 혼복 신인부 added');

  // 최종 확인
  const [finalEvents] = await conn.query('SELECT id, eventType, skillLevel, maxTeams, dayLabel FROM tournament_events WHERE tournamentId = 1 ORDER BY id');
  console.log('\n📋 Final events:');
  console.table(finalEvents);

  const [finalTournament] = await conn.query('SELECT startDate, endDate, feePerTeam, officialDocUrl FROM tournaments WHERE id = 1');
  console.log('\n📋 Final tournament:');
  console.table(finalTournament);

  await conn.end();
}

main().catch(console.error);
