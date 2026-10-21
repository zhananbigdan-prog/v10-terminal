const assert=require('node:assert/strict');const c=require('../core.js');
assert(c.isNight('23:00','22:30','07:00'));assert(c.isNight('06:59','22:30','07:00'));assert(!c.isNight('07:00','22:30','07:00'));assert(!c.isNight('12:00','22:30','07:00'));assert(c.isNight('14:00','13:00','15:00'));assert(!c.isNight('14:00','13:00','13:00'));
function weather(t,r=0,low=t){return {current:{apparent_temperature:t},daily:{precipitation_probability_max:[r],temperature_2m_min:[low]}}}
assert(c.outfit(weather(3)).includes('羽绒服'));assert(c.outfit(weather(27)).includes('透气'));assert(c.outfit(weather(19,70)).includes('带伞'));assert(c.outfit(weather(19,0,9)).includes('温差'));assert(c.outfit(weather(null)).includes('缺失'));
console.log('PASS: cross-midnight schedule, boundaries, daytime schedule, clothing thresholds, missing weather.');
for(const day of [1,2,3,4,5]){for(const t of ['07:10','08:29','19:30','21:29'])assert(c.displayOn(day,t));for(const t of ['07:09','08:30','19:29','21:30'])assert(!c.displayOn(day,t));}assert(!c.displayOn(0,'07:30'));assert(!c.displayOn(6,'20:00'));
assert.equal(c.voiceIntent('今天天气怎么样',false).kind,'ignore');assert.equal(c.voiceIntent('天猫精灵，熄屏。',false).kind,'sleep');assert.equal(c.voiceIntent('天猫精灵',false).kind,'wake');assert.equal(c.voiceIntent('今天穿什么',true).kind,'weather');assert.equal(c.voiceIntent('不要熄屏',true).kind,'chat');assert.equal(c.voiceIntent('亮屏',true).kind,'screen');assert.equal(c.voiceIntent('静音',true).kind,'mute');
console.log('PASS: weekday windows and wake-gated exact voice commands.');
