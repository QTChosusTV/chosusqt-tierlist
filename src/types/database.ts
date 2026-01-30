export interface Database {
  public: {
    Tables: {
      tiers: {
        Row: {
          uuid: string;
          username: string;
          axe?: string;
          smp?: string;
          sword?: string;
          mace?: string;
          uhc?: string;
          nethop?: string;
          vanilla?: string;
          diapot?: string;
        };
        Insert: {
          uuid: string;
          username: string;
          axe?: string;
          smp?: string;
          sword?: string;
          mace?: string;
          uhc?: string;
          nethop?: string;
          vanilla?: string;
          diapot?: string;
        };
        Update: {
          uuid?: string;
          username?: string;
          axe?: string;
          smp?: string;
          sword?: string;
          mace?: string;
          uhc?: string;
          nethop?: string;
          vanilla?: string;
          diapot?: string;
        };
      };
    };
  };
}
