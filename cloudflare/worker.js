const CATALOG = {
  khaliya_mini:{name:"Khaliya — Mini",price:15},
  khaliya_regular:{name:"Khaliya — Regular",price:80},
  khaliya_family:{name:"Khaliya — Family",price:150},
  shorties_jar:{name:"Shortie Pop Jar",price:35,flavour:true},
  shorties_box4:{name:"Shorties — Box of 4",price:35},
  shorties_box10:{name:"Shorties — Box of 10",price:80},
  bowl_large_1:{name:"Glass Bowl — Large",price:265,flavour:true},
  bowl_large_2:{name:"Glass Bowls Set of 2 — Large",price:500,flavour:true},
  bowl_large_3:{name:"Glass Bowls Set of 3 — Large",price:710,flavour:true},
  bowl_medium_1:{name:"Glass Bowl — Medium",price:190,flavour:true},
  bowl_medium_2:{name:"Glass Bowls Set of 2 — Medium",price:360,flavour:true},
  bowl_medium_3:{name:"Glass Bowls Set of 3 — Medium",price:500,flavour:true},
  bowl_small_1:{name:"Glass Bowl — Small",price:150,flavour:true},
  bowl_small_2:{name:"Glass Bowls Set of 2 — Small",price:300,flavour:true},
  bowl_small_3:{name:"Glass Bowls Set of 3 — Small",price:400,flavour:true},
  bowl_mini_1:{name:"Glass Bowl — Mini",price:60,flavour:true},
  bowl_mini_2:{name:"Glass Bowls Set of 2 — Mini",price:120,flavour:true},
  bowl_mini_3:{name:"Glass Bowls Set of 3 — Mini",price:160,flavour:true},
  voucher_50:{name:"Gift Voucher — AED 50",price:50},
  voucher_100:{name:"Gift Voucher — AED 100",price:100},
  voucher_150:{name:"Gift Voucher — AED 150",price:150}
};
const FLAVOURS={
  "cc-dark":"Coconut Cream (Dark Chocolate)",
  "cc-white":"Coconut Cream (White Chocolate)",
  "cc-mixed":"Coconut Cream (Mixed Dark & White Chocolate)",
  "pistachio":"Salted Pistachio",
  "caramel":"Salted Caramel"
};
const ALLOWED_ORIGINS=["https://awadqass-boop.github.io","http://localhost:8000","http://127.0.0.1:8000"];
function cors(request){const origin=request.headers.get("Origin")||"";const allow=ALLOWED_ORIGINS.includes(origin)?origin:ALLOWED_ORIGINS[0];return{"Access-Control-Allow-Origin":allow,"Access-Control-Allow-Methods":"GET,POST,PATCH,OPTIONS","Access-Control-Allow-Headers":"Content-Type,X-Admin-Key","Access-Control-Max-Age":"86400","Vary":"Origin"}}
function json(request,data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors(request)}})}
function cleanPhone(v){return String(v||"").replace(/\D/g,"")}
function makeOrderNumber(){return"SS"+(crypto.getRandomValues(new Uint32Array(1))[0]%900000+100000)}
function requireAdmin(request,env){return !!(env.ADMIN_KEY&&(request.headers.get("X-Admin-Key")||"")===env.ADMIN_KEY)}
async function availabilityMap(env){
  const rows=await env.DB.prepare("SELECT product_id,available FROM product_availability").all();
  const map={}; for(const id of Object.keys(CATALOG))map[id]=true;
  for(const id of Object.keys(FLAVOURS))map["flavour:"+id]=true;
  for(const r of rows.results||[])map[r.product_id]=!!r.available;
  return map;
}
async function publicProducts(request,env){
  const available=await availabilityMap(env);
  return json(request,{
    products:Object.entries(CATALOG).map(([id,p])=>({id,...p,available:available[id]!==false})),
    flavours:Object.entries(FLAVOURS).map(([id,name])=>({id,name,available:available["flavour:"+id]!==false}))
  });
}
async function createOrder(request,env){
  const b=await request.json();
  const name=String(b.name||"").trim(),phone=String(b.phone||"").trim(),email=String(b.email||"").trim();
  const fulfillment=["delivery","pickup"].includes(b.fulfillment)?b.fulfillment:"delivery";
  const address=String(b.address||"").trim(),preferredDate=String(b.preferred_date||"").trim(),preferredTime=String(b.preferred_time||"").trim();
  const notes=String(b.notes||"").trim(),isGift=!!b.is_gift,recipientName=String(b.recipient_name||"").trim(),recipientPhone=String(b.recipient_phone||"").trim();
  const giftMessage=String(b.gift_message||"").trim(),hidePrice=!!b.hide_price,promo=String(b.promo_code||"").trim().toUpperCase();
  const items=Array.isArray(b.items)?b.items:[];
  if(!name||!phone||!items.length)return json(request,{error:"Missing required order details."},400);
  if(fulfillment==="delivery"&&!address)return json(request,{error:"Delivery address is required."},400);
  const availability=await availabilityMap(env),normalized=[]; let subtotal=0,hasCustom=false;
  for(const raw of items){
    const qty=Math.max(1,Math.min(99,Number(raw.qty)||1));
    if(raw.custom){
      const title=String(raw.name||raw.description||"Custom request").trim().slice(0,240);
      normalized.push({sku:"custom",name:title,qty,price:0,total:0,flavours:[],note:String(raw.note||"").trim(),custom:true});
      hasCustom=true; continue;
    }
    const sku=String(raw.sku||"").trim(),p=CATALOG[sku];
    if(!p)return json(request,{error:"One of the selected products is no longer available."},409);
    if(availability[sku]===false)return json(request,{error:p.name+" is currently sold out."},409);
    const flavourIds=Array.isArray(raw.flavours)?raw.flavours.filter(x=>FLAVOURS[x]):[];
    for(const fid of flavourIds)if(availability["flavour:"+fid]===false)return json(request,{error:FLAVOURS[fid]+" is currently unavailable."},409);
    const total=p.price*qty; subtotal+=total;
    normalized.push({sku,name:p.name,qty,price:p.price,total,flavours:flavourIds.map(id=>({id,name:FLAVOURS[id]})),note:String(raw.note||"").trim(),custom:false});
  }
  if(!normalized.length)return json(request,{error:"Choose at least one item."},400);
  for(let i=0;i<5;i++){
    const orderNumber=makeOrderNumber();
    try{
      await env.DB.prepare(`INSERT INTO orders
      (order_number,customer_name,phone,email,notes,fulfillment_type,delivery_address,preferred_date,preferred_time,is_gift,recipient_name,recipient_phone,gift_message,hide_price,notification_preference,promo_code,items_json,total_aed,delivery_fee,payment_link,paid,status,admin_note)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'',0,'received','')`)
      .bind(orderNumber,name,phone,email,notes,fulfillment,address,preferredDate,preferredTime,isGift?1:0,recipientName,recipientPhone,giftMessage,hidePrice?1:0,"whatsapp",promo,JSON.stringify(normalized),subtotal).run();
      return json(request,{ok:true,order_number:orderNumber,subtotal_aed:subtotal,delivery_fee:0,total_aed:subtotal,paid:false,status:"received",has_custom:hasCustom},201);
    }catch(e){if(!String(e).toLowerCase().includes("unique"))throw e}
  }
  return json(request,{error:"Could not create an order number. Try again."},500);
}
async function getPublicOrder(request,env,orderNumber,url){
  const phone=cleanPhone(url.searchParams.get("phone")); if(!phone)return json(request,{error:"Phone number is required."},400);
  const row=await env.DB.prepare(`SELECT order_number,customer_name,phone,fulfillment_type,delivery_address,preferred_date,preferred_time,is_gift,items_json,total_aed,delivery_fee,payment_link,paid,status,created_at FROM orders WHERE order_number=?`).bind(orderNumber.toUpperCase()).first();
  if(!row||cleanPhone(row.phone)!==phone)return json(request,{error:"Order not found."},404);
  const fee=Number(row.delivery_fee||0),subtotal=Number(row.total_aed||0);
  return json(request,{...row,is_gift:!!row.is_gift,paid:!!row.paid,subtotal_aed:subtotal,delivery_fee:fee,total_aed:subtotal+fee,items:JSON.parse(row.items_json||"[]")});
}
async function listOrders(request,env){
  if(!requireAdmin(request,env))return json(request,{error:"Unauthorized"},401);
  const r=await env.DB.prepare(`SELECT order_number,customer_name,phone,email,notes,fulfillment_type,delivery_address,preferred_date,preferred_time,is_gift,recipient_name,recipient_phone,gift_message,hide_price,notification_preference,promo_code,items_json,total_aed,delivery_fee,payment_link,paid,status,admin_note,created_at FROM orders ORDER BY id DESC LIMIT 500`).all();
  return json(request,{orders:(r.results||[]).map(x=>({...x,paid:!!x.paid,is_gift:!!x.is_gift,hide_price:!!x.hide_price,subtotal_aed:Number(x.total_aed||0),delivery_fee:Number(x.delivery_fee||0),grand_total_aed:Number(x.total_aed||0)+Number(x.delivery_fee||0),items:JSON.parse(x.items_json||"[]")}))});
}
async function updateOrder(request,env,orderNumber){
  if(!requireAdmin(request,env))return json(request,{error:"Unauthorized"},401);
  const b=await request.json(),allowed=["received","paid","accepted","baking","ready","delivery","delivered","cancelled"],fields=[],values=[];
  if(typeof b.paid==="boolean"){fields.push("paid=?");values.push(b.paid?1:0)}
  if(b.status){if(!allowed.includes(b.status))return json(request,{error:"Invalid status."},400);fields.push("status=?");values.push(b.status)}
  if(b.delivery_fee!==undefined){const fee=Math.max(0,Number(b.delivery_fee)||0);fields.push("delivery_fee=?");values.push(fee)}
  if(b.admin_note!==undefined){fields.push("admin_note=?");values.push(String(b.admin_note||"").slice(0,1000))}
  if(b.payment_link!==undefined){fields.push("payment_link=?");values.push(String(b.payment_link||"").trim().slice(0,1000))}
  if(!fields.length)return json(request,{error:"Nothing to update."},400);
  values.push(orderNumber.toUpperCase());
  const r=await env.DB.prepare(`UPDATE orders SET ${fields.join(",")} WHERE order_number=?`).bind(...values).run();
  if(!r.meta?.changes)return json(request,{error:"Order not found."},404);
  return json(request,{ok:true});
}
async function setAvailability(request,env,id){
  if(!requireAdmin(request,env))return json(request,{error:"Unauthorized"},401);
  if(!CATALOG[id]&&!String(id).startsWith("flavour:"))return json(request,{error:"Unknown item."},404);
  if(String(id).startsWith("flavour:")&&!FLAVOURS[String(id).slice(8)])return json(request,{error:"Unknown flavour."},404);
  const b=await request.json(); if(typeof b.available!=="boolean")return json(request,{error:"available must be boolean."},400);
  await env.DB.prepare("INSERT INTO product_availability(product_id,available) VALUES(?,?) ON CONFLICT(product_id) DO UPDATE SET available=excluded.available").bind(id,b.available?1:0).run();
  return json(request,{ok:true});
}
export default{async fetch(request,env){
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(request)});
  try{
    const url=new URL(request.url),path=url.pathname.replace(/\/+$/,"")||"/";
    if(request.method==="GET"&&path==="/health")return json(request,{ok:true,service:"Short & Sweet Orders API",catalog_version:2});
    if(request.method==="GET"&&path==="/products")return publicProducts(request,env);
    if(request.method==="POST"&&path==="/orders")return createOrder(request,env);
    if(request.method==="GET"&&/^\/orders\/[^/]+$/.test(path))return getPublicOrder(request,env,decodeURIComponent(path.split("/")[2]),url);
    if(request.method==="GET"&&path==="/admin/orders")return listOrders(request,env);
    if(request.method==="PATCH"&&/^\/admin\/orders\/[^/]+$/.test(path))return updateOrder(request,env,decodeURIComponent(path.split("/")[3]));
    if(request.method==="PATCH"&&/^\/admin\/products\/[^/]+$/.test(path))return setAvailability(request,env,decodeURIComponent(path.split("/")[3]));
    return json(request,{error:"Not found."},404);
  }catch(e){return json(request,{error:"Server error.",detail:String(e?.message||e)},500)}
}};