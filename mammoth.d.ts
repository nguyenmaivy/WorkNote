declare module "mammoth" {
  export interface RawTextResult {
    value: string;
    messages: any[];
  }
  
  export interface ExtractRawTextOptions {
    buffer?: Buffer;
    path?: string;
  }
  
  export function extractRawText(input: ExtractRawTextOptions): Promise<RawTextResult>;
}
