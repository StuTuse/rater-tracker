// Official OAuth SimpleStorage contract. Credentials stay in process memory.
export function memoryAuthStorage(seed = {}) {
 const data=new Map(Object.entries(seed));
 return {
  getItem:async key=>data.get(key)??null,
  setItem:async(key,value)=>{data.set(key,value);},
  removeItem:async key=>{data.delete(key);},
  getItemSync:key=>data.get(key)??null,
  setItemSync:(key,value)=>{data.set(key,value);},
  removeItemSync:key=>{data.delete(key);}
 };
}
