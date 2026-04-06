export type Region =
  | "Africa"
  | "Americas"
  | "Asia"
  | "Europe"
  | "Oceania"
  | "Antarctica";

export interface Country {
  id: string;
  name: string;
  officialName: string;
  capital: string;
  region: Region;
  subregion: string;
  lat: number;
  lng: number;
  flagEmoji: string;
  flagSvgUrl: string;
  alternatives: string[];
  capitalAlternatives: string[];
}
