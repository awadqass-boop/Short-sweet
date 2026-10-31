const PRODUCTS = {
  khaliya_mini: { name: "Khaliya — Mini", price: 35 },
  khaliya_regular: { name: "Khaliya — Regular", price: 35 },
  khaliya_family: { name: "Khaliya — Family", price: 80 },
  shorties_jar: { name: "Shorties — Mini's Jar", price: 35 },
  shorties_box4: { name: "Shorties — Box of 4", price: 35 },
  shorties_box10: { name: "Shorties — Box of 10", price: 80 },
  voucher_50: { name: "Gift Voucher — AED 50", price: 50 },
  voucher_100: { name: "Gift Voucher — AED 100", price: 100 },
  voucher_150: { name: "Gift Voucher — AED 150", price: 150 }
};

const ALLOWED_ORIGINS = [
  "https://awadqass-boop.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
];

function cors(request) {
  const origin = request.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Admin-Key",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function json(request,data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors(request)}})}
function cleanPhone(v){return String(v||"").replace(/\D/g,"")}
function makeOrderNumber(){return "SS"+(crypto.getRandomValues(new Uint32Array(1))[0]%900000+100000)}
function requireAdmin(request,env){const key=request.headers.get("X-Admin-Key")||"";return env.ADMIN_KEY&&key===env.ADMIN_KEY}

async function createOrder(request,env){
  const body=await request.json();
  const name=String(body.name||"").trim(),phone=String(body.phone||"").trim(),email=String(body.email||"").trim(),notes=String(body.notes||"").trim();
  const fulfillment=["delivery","pickup"].includes(body.fulfillment)?body.fulfillment:"delivery";
  const items=Array.isArray(body.items)?body.items:[];
  if(!name||!phone||!items.length)return json(request,{error:"Missing required order details."},400);

  const normalized=[];let total=0;
  for(const item of items){
    const p=PRODUCTS[item.id],qty=Math.max(0,Math.min(20,Number(item.qty)||0));
    if(!p||!qty)continue;
    total+=p.price*qty;normalized.push({id:item.id,name:p.name,qty,price:p.price});
  }
  if(!normalized.length)return json(request,{error:"Choose at least one item."},400);

  for(let i=0;i<5;i++){
    const orderNumber=makeOrderNumber();
    try{
      await env.DB.prepare(`INSERT INTO orders
      (order_number,customer_name,phone,email,notes,fulfillment_type,items_json,total_aed,paid,status)
      VALUES(?,?,?,?,?,?,?,?,0,'received')`)
      .bind(orderNumber,name,phone,email,notes,fulfillment,JSON.stringify(normalized),total).run();
      return json(request,{ok:true,order_number:orderNumber,total_aed:total,paid:false,status:"received",fulfillment_type:fulfillment},201);
    }catch(e){if(!String(e).toLowerCase().includes("unique"))throw e}
  }
  return json(request,{error:"Could not create an order number. Try again."},500);
}

async function getPublicOrder(request,env,orderNumber,url){
  const phone=cleanPhone(url.searchParams.get("phone"));
  if(!phone)return json(request,{error:"Phone number is required."},400);
  const row=await env.DB.prepare(`SELECT order_number,customer_name,phone,fulfillment_type,items_json,total_aed,paid,status,created_at
    FROM orders WHERE order_number=?`).bind(orderNumber.toUpperCase()).first();
  if(!row||cleanPhone(row.phone)!==phone)return json(request,{error:"Order not found."},404);
  return json(request,{order_number:row.order_number,customer_name:row.customer_name,fulfillment_type:row.fulfillment_type,items:JSON.parse(row.items_json||"[]"),total_aed:row.total_aed,paid:!!row.paid,status:row.status,created_at:row.created_at});
}

async function listOrders(request,env){
  if(!requireAdmin(request,env))return json(request,{error:"Unauthorized"},401);
  const result=await env.DB.prepare(`SELECT order_number,customer_name,phone,email,notes,fulfillment_type,items_json,total_aed,paid,status,created_at
    FROM orders ORDER BY id DESC LIMIT 200`).all();
  return json(request,{orders:(result.results||[]).map(r=>({...r,paid:!!r.paid,items:JSON.parse(r.items_json||"[]")}))});
}

async function updateOrder(request,env,orderNumber){
  if(!requireAdmin(request,env))return json(request,{error:"Unauthorized"},401);
  const body=await request.json(),allowed=["received","paid","accepted","baking","ready","delivery","delivered","cancelled"],fields=[],values=[];
  if(typeof body.paid==="boolean"){fields.push("paid=?");values.push(body.paid?1:0)}
  if(body.status){if(!allowed.includes(body.status))return json(request,{error:"Invalid status."},400);fields.push("status=?");values.push(body.status)}
  if(!fields.length)return json(request,{error:"Nothing to update."},400);
  values.push(orderNumber.toUpperCase());
  const result=await env.DB.prepare(`UPDATE orders SET ${fields.join(",")} WHERE order_number=?`).bind(...values).run();
  if(!result.meta?.changes)return json(request,{error:"Order not found."},404);
  return json(request,{ok:true});
}

export default{async fetch(request,env){
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(request)});
  try{
    const url=new URL(request.url),path=url.pathname.replace(/\/+$/,"")||"/";
    if(request.method==="GET"&&path==="/health")return json(request,{ok:true,service:"Short & Sweet Orders API"});
    if(request.method==="POST"&&path==="/orders")return createOrder(request,env);
    if(request.method==="GET"&&/^\/orders\/[^/]+$/.test(path))return getPublicOrder(request,env,decodeURIComponent(path.split("/")[2]),url);
    if(request.method==="GET"&&path==="/admin/orders")return listOrders(request,env);
    if(request.method==="PATCH"&&/^\/admin\/orders\/[^/]+$/.test(path))return updateOrder(request,env,decodeURIComponent(path.split("/")[3]));
    return json(request,{error:"Not found."},404);
  }catch(e){return json(request,{error:"Server error.",detail:String(e?.message||e)},500)}
}};