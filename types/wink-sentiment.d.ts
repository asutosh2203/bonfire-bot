declare module 'wink-sentiment' {
  export interface SentimentResult {
    score: number;
    normalizedScore: number;
    tokenizedPhrase: any[];
  }

  function sentiment(phrase: string): SentimentResult;

  export = sentiment;
}
