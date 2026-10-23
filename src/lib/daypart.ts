export const DAYPARTS = ["morning", "afternoon", "evening", "night"] as const;

export type Daypart = (typeof DAYPARTS)[number];

const STARTS: readonly (readonly [number, Daypart])[] = [
  [5, "morning"],
  [12, "afternoon"],
  [17, "evening"],
  [22, "night"],
];

export function daypartOf(hour: number): Daypart {
  let part: Daypart = "night";
  for (const [start, name] of STARTS) if (hour >= start) part = name;
  return part;
}

export const daypartScript = `(function(){try{var b=${JSON.stringify(STARTS)},h=new Date().getHours(),p="night";for(var i=0;i<b.length;i++)if(h>=b[i][0])p=b[i][1];document.documentElement.dataset.daypart=p}catch(e){}})()`;
