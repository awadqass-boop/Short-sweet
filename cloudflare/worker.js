const PRODUCTS = {
  khaliya_mini:{name:"Khaliya — Mini",price:35},
  khaliya_regular:{name:"Khaliya — Regular",price:35},
  khaliya_family:{name:"Khaliya — Family",price:80},
  shorties_jar:{name:"Shorties — Mini's Jar",price:35},
  shorties_box4:{name:"Shorties — Box of 4",price:35},
  shorties_box10:{name:"Shorties — Box of 10",price:80},
  voucher_50:{name:"Gift Voucher — AED 50",price:50},
  voucher_100:{name:"Gift Voucher — AED 100",price:100},
  voucher_150:{name:"Gift Voucher — AED 150",price:150}
};
const ALLOWED_ORIGINS=["https://awadqass-boop.github.io","http://localhost:8000","http://127.0.0.1:8000"];
function cors(request){const origin=request.headers.get("Origin")||"";const allow=ALLOWED_ORIGINS.includes(origin)?origin:ALLOWED_ORIGINS[0];return{"Access-Control-Allow-Origin":allow,"Access-Control-Allow-Methods":"GET,POST,PATCH,OPTIONS","Access-Control-Allow-Headers":"Content-Type,X-Admin-Key","Access-Control-Max-Age":"86400","Vary":"Origin"}}
function json(request,data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors(request)}})}
function cleanPhone(v){return String(v||"").replace(/\D/g,"")}
function makeOrderNumber(){return"SS"+(crypto.getRandomValues(new Uint32Array(1))[0]%900000+100000)}
function requireAdmin(request,env){return !!(env.ADMIN_KEY&&(request.headers.get("X-Admin-Key")||"")===env.ADMIN_KEY)}

async function availabilityMap(env){
  const rows=await env.DB.prepare("SELECT product_id,available FROM product_availability").all();
  const map={};for(const id of Object.keys(PRODUCTS))map[id]=true;
  for(const r of rows.results||[])map[r.product_id]=!!r.available;
  return map;
}
async function publicProducts(request,env){
  const avail=await availabilityMap(env);
  return json(request,{products:Object.entries(PRODUCTS).map(([id,p])=>({id,...p,available:avail[id]!==false}))});
}
async function createOrder(request,env){
  const b=await request.json();
  const name=String(b.name||"").trim(),phone=String(b.phone||"").trim(),email=String(b.email||"").trim(),notes=String(b.notes||"").trim();
  const fulfillment=["delivery","pickup"].includes(b.fulfillment)?b.fulfillment:"delivery";
  const preferredDate=String(b.preferred_date||"").trim(),preferredTime=String(b.preferred_time||"").trim();
  const isGift=!!b.is_gift,recipientName=String(b.recipient_name||"").trim(),giftMessage=String(b.gift_message||"").trim(),hidePrice=!!b.hide_price;
  const notification=["whatsapp","sms","email","none"].includes(b.notification_preference)?b.notification_preference:"none";
  const promo=String(b.promo_code||"").trim().toUpperCase();
  const items=Array.isArray(b.items)?b.items:[];
  if(!name||!phone||!items.length)return json(request,{error:"Missing required order details."},400);
  const avail=await availabilityMap(env),normalized=[];let total=0;
  for(const item of items){
    const p=PRODUCTS[item.id],qty=Math.max(0,Math.min(20,Number(item.qty)||0));
    if(!p||!qty)continue;
    if(avail[item.id]===false)return json(request,{error:p.name+" is currently unavailable."},409);
    total+=p.price*qty;normalized.push({id:item.id,name:p.name,qty,price:p.price});
  }
  if(!normalized.length)return json(request,{error:"Choose at least one item."},400);
  // Promo field is prepared; no discounts are applied until an active promo system is configured.
  for(let i=0;i<5;i++){
    const orderNumber=makeOrderNumber();
    try{
      await env.DB.prepare(`INSERT INTO orders
      (order_number,customer_name,phone,email,notes,fulfillment_type,preferred_date,preferred_time,is_gift,recipient_name,gift_message,hide_price,notification_preference,promo_code,items_json,total_aed,paid,status)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'received')`)
      .bind(orderNumber,name,phone,email,notes,fulfillment,preferredDate,preferredTime,isGift?1:0,recipientName,giftMessage,hidePrice?1:0,notification,promo,JSON.stringify(normalized),total).run();
      return json(request,{ok:true,order_number:orderNumber,total_aed:total,paid:false,status:"received",fulfillment_type:fulfillment},201);
    }catch(e){if(!String(e).toLowerCase().includes("unique"))throw e}
  }
  return json(request,{error:"Could not create an order number. Try again."},500);
}
async function getPublicOrder(request,env,orderNumber,url){
  const phone=cleanPhone(url.searchParams.get("phone"));if(!phone)return json(request,{error:"Phone number is required."},400);
  const row=await env.DB.prepare(`SELECT order_number,customer_name,phone,fulfillment_type,preferred_date,preferred_time,is_gift,items_json,total_aed,paid,status,created_at FROM orders WHERE order_number=?`).bind(orderNumber.toUpperCase()).first();
  if(!row||cleanPhone(row.phone)!==phone)return json(request,{error:"Order not found."},404);
  return json(request,{...row,is_gift:!!row.is_gift,paid:!!row.paid,items:JSON.parse(row.items_json||"[]")});
}
async function listOrders(request,env){
  if(!requireAdmin(request,env))return json(request,{error:"Unauthorized"},401);
  const r=await env.DB.prepare(`SELECT order_number,customer_name,phone,email,notes,fulfillment_type,preferred_date,preferred_time,is_gift,recipient_name,gift_message,hide_price,notification_preference,promo_code,items_json,total_aed,paid,status,created_at FROM orders ORDER BY id DESC LIMIT 200`).all();
  return json(request,{orders:(r.results||[]).map(x=>({...x,paid:!!x.paid,is_gift:!!x.is_gift,hide_price:!!x.hide_price,items:JSON.parse(x.items_json||"[]")}))});
}
async function updateOrder(request,env,orderNumber){
  if(!requireAdmin(request,env))return json(request,{error:"Unauthorized"},401);
  const b=await request.json(),allowed=["received","paid","accepted","baking","ready","delivery","delivered","cancelled"],fields=[],values=[];
  if(typeof b.paid==="boolean"){fields.push("paid=?");values.push(b.paid?1:0)}
  if(b.status){if(!allowed.includes(b.status))return json(request,{error:"Invalid status."},400);fields.push("status=?");values.push(b.status)}
  if(!fields.length)return json(request,{error:"Nothing to update."},400);
  values.push(orderNumber.toUpperCase());
  const r=await env.DB.prepare(`UPDATE orders SET ${fields.join(",")} WHERE order_number=?`).bind(...values).run();
  if(!r.meta?.changes)return json(request,{error:"Order not found."},404);return json(request,{ok:true});
}
async function setAvailability(request,env,id){
  if(!requireAdmin(request,env))return json(request,{error:"Unauthorized"},401);
  if(!PRODUCTS[id])return json(request,{error:"Unknown product."},404);
  const b=await request.json();if(typeof b.available!=="boolean")return json(request,{error:"available must be boolean."},400);
  await env.DB.prepare("INSERT INTO product_availability(product_id,available) VALUES(?,?) ON CONFLICT(product_id) DO UPDATE SET available=excluded.available").bind(id,b.available?1:0).run();
  return json(request,{ok:true});
}
export default{async fetch(request,env){
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(request)});
  try{const url=new URL(request.url),path=url.pathname.replace(/\/+$/,"")||"/";
    if(request.method==="GET"&&path==="/health")return json(request,{ok:true,service:"Short & Sweet Orders API"});
    if(request.method==="GET"&&path==="/products")return publicProducts(request,env);
    if(request.method==="POST"&&path==="/orders")return createOrder(request,env);
    if(request.method==="GET"&&/^\/orders\/[^/]+$/.test(path))return getPublicOrder(request,env,decodeURIComponent(path.split("/")[2]),url);
    if(request.method==="GET"&&path==="/admin/orders")return listOrders(request,env);
    if(request.method==="PATCH"&&/^\/admin\/orders\/[^/]+$/.test(path))return updateOrder(request,env,decodeURIComponent(path.split("/")[3]));
    if(request.method==="PATCH"&&/^\/admin\/products\/[^/]+$/.test(path))return setAvailability(request,env,decodeURIComponent(path.split("/")[3]));
    return json(request,{error:"Not found."},404);
  }catch(e){return json(request,{error:"Server error.",detail:String(e?.message||e)},500)}
}};