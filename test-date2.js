const yyyymmdd = "2024-05-12";
const [y, m, d] = yyyymmdd.split('-');
const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
console.log(dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }));
