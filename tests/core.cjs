const assert=require('node:assert/strict');const c=require('../core.js');
assert(c.isNight('23:00','22:30','07:00'));assert(c.isNight('06:59','22:30','07:00'));assert(!c.isNight('07:00','22:30','07:00'));assert(!c.isNight('12:00','22:30','07:00'));assert(c.isNight('14:00','13:00','15:00'));assert(!c.isNight('14:00','13:00','13:00'));
function weather(t,r=0,low=t){return {current:{apparent_temperature:t},daily:{precipitation_probability_max:[r],temperature_2m_min:[low]}}}
assert(c.outfit(weather(3)).includes('羽绒服'));assert(c.outfit(weather(27)).includes('透气'));assert(c.outfit(weather(19,70)).includes('带伞'));assert(c.outfit(weather(19,0,9)).includes('温差'));assert(c.outfit(weather(null)).includes('缺失'));
console.log('PASS: cross-midnight schedule, boundaries, daytime schedule, clothing thresholds, missing weather.');
