const NOISE = new Set(["the","that","just","do","and","of","a","at","for","llc","inc","co","company","corp","ltd","pllc","pa"]);
const GENERIC = new Set(["mount","pleasant","charleston","summerville","lowcountry","island","islands","james","johns","daniel","goose","creek","moncks","corner","isle","palms","sullivans","nexton","ladson","hanahan","carolina","north","south","east","west","greater","area","local","services","service","group","solutions","professional","quality","best","premier","custom","home","homes"]);
const normalizeName = (s) => s.toLowerCase().replace(/&/g," and ").replace(/['’]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const tokens = (s) => normalizeName(s).split(" ").filter((t) => t && !NOISE.has(t));
const squash = (s) => normalizeName(s).replace(/ /g,"");
function sameBusiness(a,b){
  if(!a||!b) return false;
  const sa=squash(a), sb=squash(b);
  if(sa===sb) return true;
  if(sa.length>=6&&sb.length>=6&&(sa.includes(sb)||sb.includes(sa))) return true;
  const ta=tokens(a), tb=tokens(b);
  if(!ta.length||!tb.length) return false;
  const setB=new Set(tb);
  const shared=ta.filter((t)=>setB.has(t));
  if(!shared.length) return false;
  if(!shared.some((t)=>!GENERIC.has(t))) return false;
  return shared.length/Math.min(ta.length,tb.length)>=0.6;
}
const should = [
  ["Alexander Heating & Air","Alexander Heating & Cooling",true],
  ["Brothers Gutters","The Brothers That Just Do Gutters",true],
  ["Colucci's","Colucci's Jewelers",true],
  ["Green Trim","Green Trim",true],
  ["Mount Pleasant Pressure Washing","Mount Pleasant Pressure Washing",true],
  ["Powell Roofing","Powell Roofing LLC",true],
  // must NOT match
  ["Mount Pleasant Pressure Washing","Mount Pleasant Dental",false],
  ["Charleston Plumbing","Charleston Roofing",false],
  ["Lowcountry Home Services","Lowcountry Home Care",false],
  ["Summerville Dental","Summerville Dermatology",false],
  ["Powell Roofing","Powell Chiropractic",false],
];
let fail=0;
for(const [a,b,want] of should){
  const got=sameBusiness(a,b);
  const ok=got===want;
  if(!ok) fail++;
  console.log(`${ok?"pass":"FAIL"}  ${want?"match   ":"no match"}  "${a}" ~ "${b}" -> ${got}`);
}
console.log(fail?`\n${fail} failing`:"\nall pass");
