const parseDateForInput = (dStr) => {
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  const offset = d.getTimezoneOffset();
  const localD = new Date(d.getTime() - (offset*60*1000));
  return localD.toISOString().split('T')[0];
}
console.log(parseDateForInput("May 12, 2024"));
