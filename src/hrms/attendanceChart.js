/** Unit contributions share a denominator, so stacked heights remain the overall attendance %. */
export function attendanceByUnit(dates, staff, attendance, units) {
  const codes = new Set(staff.map(s => s.unitCode || ''));
  const chartUnits = units.filter(u => codes.has(u.code)).map(u => ({ code: u.code, name: u.name }));
  for (const code of codes) {
    if (!chartUnits.some(u => u.code === code)) chartUnits.push({ code, name: code || 'No unit' });
  }
  const records = new Map(staff.map(s => [s.empNo, new Map((attendance[s.empNo]?.records || []).map(r => [r.date, r]))]));
  return {
    units: chartUnits,
    series: dates.map(date => {
      const counts = new Map(chartUnits.map(u => [u.code, { present: 0, total: 0 }]));
      for (const s of staff) {
        const r = records.get(s.empNo)?.get(date);
        if (!r || r.status === 'WO' || r.status === 'H') continue;
        const count = counts.get(s.unitCode || '');
        if (!count) continue;
        count.total++;
        if (r.status === 'P') count.present++;
      }
      const total = [...counts.values()].reduce((n, c) => n + c.total, 0);
      const present = [...counts.values()].reduce((n, c) => n + c.present, 0);
      return { date, total, present, pct: total ? Math.round(present / total * 100) : null,
        segments: chartUnits.map(u => {
          const count = counts.get(u.code) || { present: 0, total: 0 };
          return { ...u, ...count, contribution: total ? count.present / total * 100 : 0,
            pct: count.total ? Math.round(count.present / count.total * 100) : null };
        }) };
    })
  };
}
/** Per unit/day present & absent counts; days with no records for a unit are 'missing', days after today 'future'. */
export function attendanceCalendar(dates, staff, attendance, units, today) {
  const { units: rows } = attendanceByUnit([], staff, attendance, units);
  const records = new Map(staff.map(s => [s.empNo, new Map((attendance[s.empNo]?.records || []).map(r => [r.date, r]))]));
  const cell = (list, date) => {
    let present = 0, absent = 0, off = 0, seen = 0;
    for (const s of list) {
      const r = records.get(s.empNo)?.get(date);
      if (!r) continue;
      seen++;
      if (r.status === 'WO' || r.status === 'H') off++;
      else if (r.status === 'P') present++;
      else absent++;
    }
    const status = today && date > today ? 'future' : seen ? 'ok' : 'missing';
    return { date, present, absent, off, status };
  };
  return {
    rows: rows.map(u => {
      const list = staff.filter(s => (s.unitCode || '') === u.code);
      return { ...u, cells: dates.map(d => cell(list, d)) };
    }),
    total: dates.map(d => cell(staff, d)),
  };
}
