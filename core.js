(function(root){
 function minute(time){var p=String(time).split(':');return Number(p[0])*60+Number(p[1]);}
 function isNight(time,start,end){var t=minute(time),a=minute(start),b=minute(end);return a===b?false:a<b?t>=a&&t<b:t>=a||t<b;}
 function outfit(w){var t=w.current.apparent_temperature,r=w.daily.precipitation_probability_max[0],low=w.daily.temperature_2m_min[0],text;
 if(t==null||!isFinite(t))return '体感温度缺失，暂不判断衣服厚度。';
 if(t<5)text='厚外套或羽绒服，内搭保暖层；出门注意护住脖子。';else if(t<12)text='毛衣配厚外套比较稳妥，怕冷的话加一层薄保暖。';else if(t<18)text='长袖配针织衫或外套，方便进屋脱掉一层。';else if(t<24)text='轻薄长袖或衬衫就好，带一件薄外套应对早晚。';else text='轻薄透气的上衣更舒服，注意防晒。';
 if(r>=50)text+=' 今天有降雨可能，记得带伞。';if(low!=null&&t-low>=8)text+=' 早晚温差较大，建议分层穿。';return text+' 按个人怕冷程度调整。';}
 function weatherUrl(lat,lon){return 'https://api.open-meteo.com/v1/forecast?latitude='+encodeURIComponent(lat)+'&longitude='+encodeURIComponent(lon)+'&current=temperature_2m,apparent_temperature,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FShanghai&forecast_days=1';}
 var api={minute:minute,isNight:isNight,outfit:outfit,weatherUrl:weatherUrl};if(typeof module==='object'&&module.exports)module.exports=api;else root.CompanionCore=api;
})(this);
