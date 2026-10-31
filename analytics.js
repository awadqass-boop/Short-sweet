(function(){
  const id=window.SHORT_SWEET_GA_ID||"";
  if(!id)return;
  const s=document.createElement("script");
  s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(id);
  document.head.appendChild(s);
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){dataLayer.push(arguments)};
  gtag("js",new Date());gtag("config",id,{anonymize_ip:true});
  document.addEventListener("click",function(e){
    const el=e.target.closest("[data-ss-event]");
    if(el)gtag("event",el.dataset.ssEvent,{event_category:"Short & Sweet",event_label:el.dataset.ssLabel||el.textContent.trim().slice(0,80)});
  });
})();