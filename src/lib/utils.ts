import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Project, Scene, BillingMode } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function calculateSceneTotal(scene: Scene, project: Project) {
  const assetTotal = (scene.assets || []).reduce((acc, asset) => acc + (asset.cost || 0), 0);
  if (project.billingMode === BillingMode.HOURLY) {
    return ((scene.hours || 0) * (project.billingRate || 0)) + assetTotal;
  }
  return (scene.baseSceneCost || 0) + assetTotal;
}

export function calculateProjectTotal(project: Project) {
  if (!project || !project.scenes) return 0;
  return project.scenes.reduce((acc, scene) => acc + calculateSceneTotal(scene, project), 0);
}

export function formatDate(dateString: string) {
  if (!dateString || dateString === 'N/A') return 'N/A';
  // Split YYYY-MM-DD and create local date to avoid timezone shifts
  const [year, month, day] = dateString.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return 'N/A';
  return new Date(year, month - 1, day).toLocaleDateString();
}
