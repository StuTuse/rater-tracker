// Official OAuth SimpleStorage contract. Credentials stay in process memory.
export function memoryAuthStorage(seed = {}) {
 const data=new Map(Object.entries(seed));
 return {
  snapshot:()=>Object.fromEntries(data),
  replace:seed=>{data.clear();for(const [key,value]of Object.entries(seed??{}))data.set(key,value);},
  clear:()=>data.clear(),
  getItem:async key=>data.get(key)??null,
  setItem:async(key,value)=>{data.set(key,value);},
  removeItem:async key=>{data.delete(key);},
  getItemSync:key=>data.get(key)??null,
  setItemSync:(key,value)=>{data.set(key,value);},
  removeItemSync:key=>{data.delete(key);}
 };
}
