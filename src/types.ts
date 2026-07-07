export enum AssetStatus {
  PURCHASED = 'purchased',
  PROVIDED = 'provided',
  CREATED = 'created',
  EXISTING = 'existing'
}

export enum BillingMode {
  QUOTE = 'quote',
  HOURLY = 'hourly'
}

export interface Asset {
  id: string;
  name: string;
  status: AssetStatus;
  cost: number;
  description?: string;
}

export interface Scene {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  audioVO?: string;
  textOverlayStyle: string;
  textOverlayContent: string;
  audioTracks?: { name: string; type: string }[];
  assets: Asset[];
  baseSceneCost: number;
  hours: number; // For hourly billing
  hours3D?: number; // 3D hours
  hoursComp?: number; // Comp hours
  tags: string[];
  cameraMove?: string;
  shotCount?: number;
  references?: { id: string; url: string; note?: string }[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  tags: string[];
  resolution: string;
  frameRate: string;
  duration: string;
  billingMode: BillingMode;
  billingRate: number;
  billingRateUnit: 'hour' | 'day';
  revisionsAllowed: number;
  extendedRevisionPrice: number;
  platformName: string;
  platformLink: string;
  paymentMethods: string[];
  scenes: Scene[];
  milestones: { name: string; date: string }[];
}

export type ProjectScopeRequest = {
  description: string;
  referenceImages?: string[];
  artisticStyle?: string;
};
