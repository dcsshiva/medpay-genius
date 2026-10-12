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