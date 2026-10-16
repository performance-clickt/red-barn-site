import { getEmDashCollection, getEmDashEntry, type PortableTextBlock } from 'emdash';
import { renderRichText } from './cms-rich-text.mjs';
import type home from '../content/homepage.json';
import type settings from '../content/settings.json';
import type insights from '../content/insights.json';
export interface PageEntry {title:string;seoTitle:string;h1:string;description:string;heroImage:string|null;heroAlt:string;sourceUrl:string|null;content:PortableTextBlock[];date?:string;author?:string;}
const camel=(s:string)=>s.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());
function adapt(data:Record<string,unknown>):Record<string,any> {
 return Object.fromEntries(Object.entries(data).map(([k,v])=>[camel(k),v && typeof v==='object' && !Array.isArray(v) && 'id' in v && ('src' in v || 'provider' in v) ? ((v as any).src || `/_emdash/api/media/file/${(v as any).meta?.storageKey || (v as any).id}`) : v]));
}
async function read<T>(collection:string,slug:string):Promise<T|null> {
 const {entry,error}=await getEmDashEntry(collection,slug);
 if(error)throw error;
 return entry ? adapt(entry.data as Record<string,unknown>) as T : null;
}
function collection(name:string) {
 const readEntry=(slug:string)=>read<PageEntry>(name,slug);
 return {
  read:readEntry,
  async readOrThrow(slug:string){const entry=await readEntry(slug);if(!entry)throw new Error(`Missing published ${name}/${slug}`);return entry;},
  async all(){
   const entries:{slug:string;entry:PageEntry}[]=[];let cursor:string|undefined;
   do {
    const result=await getEmDashCollection(name,{limit:100,cursor,orderBy:{slug:'asc'}});
    if(result.error)throw result.error;
    entries.push(...result.entries.map(e=>({slug:e.id,entry:adapt(e.data as Record<string,unknown>) as PageEntry})));
    cursor=result.nextCursor;
   } while(cursor);
   return entries;
  },
  async list(){return (await this.all()).map(e=>e.slug);},
 };
}
function singleton<T>(name:string,transform:(data:Record<string,any>)=>T=(v)=>v as T) {
 return {async readOrThrow(){const data=await read<Record<string,any>>(name,'main');if(!data)throw new Error(`Missing published ${name}/main`);return transform(data);}};
}
/** Compatibility adapter keeps presentation components independent of the CMS schema. */
export const reader={
 collections:{pages:collection('pages'),posts:collection('posts')},
 singletons:{
  settings:singleton<typeof settings>('settings'),insights:singleton<typeof insights>('insights_settings'),
  homepage:singleton<typeof home>('homepage',data=>({...data,
   gallery:data.gallery.map((v:Record<string,unknown>)=>adapt(v)),
   familyTakeaways:data.familyTakeaways.map((v:{text:string})=>v.text),
   pillars:data.pillars.map((v:{text:string})=>v.text),
   quizBenefits:data.quizBenefits.map((v:{text:string})=>v.text),
  } as typeof home)),
 },
};
export async function renderBody(entry:PageEntry){return renderRichText(entry.content);}
export function shortTitle(title:string){return title.split(/\s[|—]\s/)[0];}
