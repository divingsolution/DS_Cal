/* Calendar colors share the existing events.description field as a hidden metadata comment.
 * This avoids a database migration and keeps older event data readable. */
(function(root){
 const marker=/\n?<!--ds-calendar-color:(#[0-9a-f]{6})-->\s*$/i;
 const valid=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
 function decode(e){const description=String(e.description||''),m=description.match(marker);return {...e,description:description.replace(marker,''),color:m?m[1].toLowerCase():null}}
 function encode(description,color){const plain=String(description||'').replace(marker,'');return valid(color)?plain+(plain?'\n':'')+'<!--ds-calendar-color:'+color.toLowerCase()+'-->':plain}
 function automatic(e){const t=String(e.title||'');if(/고스트|ghost/i.test(t)||e.category==='해양정화')return '#111111';if(/출장/.test(t))return '#b45309';return {'국내투어':'#0369a1','해외투어':'#4338ca','교육':'#0f766e','프로과정':'#173f58','강사시험':'#a16207','행사':'#be185d'}[e.category]||'#475569'}
 function color(e){return valid(e.color)?e.color:automatic(e)}
 function rgb(c){return [1,3,5].map(i=>parseInt(c.slice(i,i+2),16))}
 function text(c){const [r,g,b]=rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b>.179?'#102c37':'#ffffff'}
 function tint(c){return '#'+rgb(c).map(v=>Math.round(v*.1+255*.9).toString(16).padStart(2,'0')).join('')}
 function style(e,solid=false){const c=color(e);return solid?'background:'+c+';color:'+text(c)+';border-color:'+c:'background:'+tint(c)+';border-left:5px solid '+c}
 function paint(el,e,solid=false){el.style.cssText+=';'+style(e,solid)}
 function firstSegment(e,seen){const id=e.id||[e.title,e.start_date,e.end_date,e.category].join("|");if(seen.has(id))return false;seen.add(id);return true}
 const api={firstSegment,valid,decode,encode,automatic,color,text,tint,style,paint};root.DSCalendarColors=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
