/**
 * Analytics Utilities for Changisha
 * Calculations and transformations for reporting
 */

export interface CampaignMetrics {
  campaign_id: number;
  campaign_name: string;
  target_amount: number;
  total_raised: number;
  pledge_count: number;
  contribution_count: number;
  avg_pledge: number;
  avg_contribution: number;
  fulfillment_rate: number;
  days_active: number;
  contributions_per_day: number;
  status: 'active' | 'closed' | 'paused';
}

export interface ContributorMetrics {
  total_contributors: number;
  avg_contribution: number;
  total_contributions: number;
  repeat_contributors: number;
  repeat_rate: number;
  top_contributor_amount: number;
  median_contribution: number;
}

export interface TimeSeriesData {
  date: string;
  contributions: number;
  amount: number;
  pledges: number;
}

export interface GeographicMetrics {
  region: string;
  pledge_count: number;
  contribution_amount: number;
  avg_pledge: number;
}

/**
 * Calculate campaign-level metrics
 */
export function calculateCampaignMetrics(
  campaign: any,
  contributions: any[],
  pledges: any[]
): CampaignMetrics {
  const totalRaised = contributions.reduce((sum, c) => sum + c.amount, 0);
  const avgPledge = pledges.length > 0 ? pledges.reduce((sum, p) => sum + p.pledged_amount, 0) / pledges.length : 0;
  const avgContribution = contributions.length > 0 ? totalRaised / contributions.length : 0;
  const fulfillmentRate = pledges.length > 0 ? (contributions.length / pledges.length) * 100 : 0;

  const createdDate = new Date(campaign.created_at);
  const now = new Date();
  const daysActive = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  const contributionsPerDay = daysActive > 0 ? contributions.length / daysActive : 0;

  return {
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    target_amount: campaign.target_amount,
    total_raised: totalRaised,
    pledge_count: pledges.length,
    contribution_count: contributions.length,
    avg_pledge: Math.round(avgPledge),
    avg_contribution: Math.round(avgContribution),
    fulfillment_rate: Math.round(fulfillmentRate),
    days_active: daysActive,
    contributions_per_day: Math.round(contributionsPerDay * 10) / 10,
    status: campaign.status,
  };
}

/**
 * Calculate contributor-level metrics
 */
export function calculateContributorMetrics(contributions: any[]): ContributorMetrics {
  const totalAmount = contributions.reduce((sum, c) => sum + c.amount, 0);
  const avgContribution = contributions.length > 0 ? totalAmount / contributions.length : 0;

  // Group by MSISDN to find repeats
  const contributorMap = new Map<string, number[]>();
  contributions.forEach((c) => {
    const amounts = contributorMap.get(c.msisdn) || [];
    amounts.push(c.amount);
    contributorMap.set(c.msisdn, amounts);
  });

  const repeatContributors = Array.from(contributorMap.values()).filter((amounts) => amounts.length > 1).length;
  const repeatRate = contributorMap.size > 0 ? (repeatContributors / contributorMap.size) * 100 : 0;

  // Calculate median
  const sortedAmounts = contributions.map((c) => c.amount).sort((a, b) => a - b);
  const medianContribution =
    sortedAmounts.length > 0
      ? sortedAmounts.length % 2 === 0
        ? (sortedAmounts[sortedAmounts.length / 2 - 1] + sortedAmounts[sortedAmounts.length / 2]) / 2
        : sortedAmounts[Math.floor(sortedAmounts.length / 2)]
      : 0;

  const topContributor = contributions.length > 0 ? Math.max(...contributions.map((c) => c.amount)) : 0;

  return {
    total_contributors: contributorMap.size,
    avg_contribution: Math.round(avgContribution),
    total_contributions: totalAmount,
    repeat_contributors: repeatContributors,
    repeat_rate: Math.round(repeatRate),
    top_contributor_amount: topContributor,
    median_contribution: Math.round(medianContribution),
  };
}

/**
 * Group contributions by date for time series
 */
export function generateTimeSeriesData(
  contributions: any[],
  pledges: any[],
  days: number = 30
): TimeSeriesData[] {
  const data: Map<string, TimeSeriesData> = new Map();

  // Initialize dates
  const today = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    data.set(dateStr, {
      date: dateStr,
      contributions: 0,
      amount: 0,
      pledges: 0,
    });
  }

  // Fill in contributions
  contributions.forEach((c) => {
    const dateStr = new Date(c.created_at).toISOString().split('T')[0];
    const entry = data.get(dateStr);
    if (entry) {
      entry.contributions += 1;
      entry.amount += c.amount;
    }
  });

  // Fill in pledges
  pledges.forEach((p) => {
    const dateStr = new Date(p.created_at).toISOString().split('T')[0];
    const entry = data.get(dateStr);
    if (entry) {
      entry.pledges += 1;
    }
  });

  return Array.from(data.values());
}

/**
 * Calculate revenue metrics
 */
export function calculateRevenueMetrics(contributions: any[], platformFeePercent: number = 2) {
  const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0);
  const platformFee = Math.round(totalContributions * (platformFeePercent / 100));
  const netPayment = totalContributions - platformFee;

  return {
    total_contributions: totalContributions,
    platform_fee: platformFee,
    net_payment: netPayment,
    fee_percent: platformFeePercent,
  };
}

/**
 * Calculate exception metrics
 */
export function calculateExceptionMetrics(exceptions: any[], contributions: any[]) {
  const exceptionRate = contributions.length > 0 ? (exceptions.length / contributions.length) * 100 : 0;

  const exceptionsByType = {
    unmatched_msisdn: exceptions.filter((e) => e.exception_type === 'unmatched_msisdn').length,
    overpaid_pledge: exceptions.filter((e) => e.exception_type === 'overpaid_pledge').length,
    invalid_amount: exceptions.filter((e) => e.exception_type === 'invalid_amount').length,
  };

  const resolvedCount = exceptions.filter((e) => e.status === 'resolved').length;
  const resolutionRate = exceptions.length > 0 ? (resolvedCount / exceptions.length) * 100 : 0;

  return {
    total_exceptions: exceptions.length,
    exception_rate: Math.round(exceptionRate * 100) / 100,
    by_type: exceptionsByType,
    resolved: resolvedCount,
    open: exceptions.length - resolvedCount,
    resolution_rate: Math.round(resolutionRate),
  };
}

/**
 * Calculate settlement metrics
 */
export function calculateSettlementMetrics(settlements: any[]) {
  const totalExpected = settlements.reduce((sum, s) => sum + s.expected_amount, 0);
  const totalReceived = settlements.reduce((sum, s) => sum + s.received_amount, 0);
  const totalDiscrepancy = settlements.reduce((sum, s) => sum + s.discrepancy, 0);

  const reconciled = settlements.filter((s) => s.status === 'reconciled').length;
  const pending = settlements.filter((s) => s.status === 'pending').length;
  const disputed = settlements.filter((s) => s.status === 'disputed').length;

  const reconciliationRate = settlements.length > 0 ? (reconciled / settlements.length) * 100 : 0;

  return {
    total_campaigns: settlements.length,
    expected_amount: totalExpected,
    received_amount: totalReceived,
    discrepancy: totalDiscrepancy,
    discrepancy_percent: totalExpected > 0 ? (totalDiscrepancy / totalExpected) * 100 : 0,
    reconciled,
    pending,
    disputed,
    reconciliation_rate: Math.round(reconciliationRate),
  };
}

/**
 * Format amount as KES with abbreviation
 */
export function formatKES(amount: number): string {
  if (amount >= 1000000) {
    return `KES ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `KES ${(amount / 1000).toFixed(0)}K`;
  }
  return `KES ${amount}`;
}

/**
 * Format percentage with decimal
 */
export function formatPercent(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

/**
 * Generate chart labels from data
 */
export function generateChartLabels(data: TimeSeriesData[]): string[] {
  return data.map((d) => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
}

/**
 * Generate chart datasets
 */
export function generateChartDatasets(data: TimeSeriesData[]) {
  return {
    contributions: data.map((d) => d.contributions),
    amounts: data.map((d) => d.amount),
    pledges: data.map((d) => d.pledges),
  };
}

/**
 * Get performance badge based on metrics
 */
export function getPerformanceBadge(fulfillmentRate: number): { label: string; color: string } {
  if (fulfillmentRate >= 90) return { label: 'Excellent', color: 'bg-green-500/20 text-green-400' };
  if (fulfillmentRate >= 75) return { label: 'Good', color: 'bg-blue-500/20 text-blue-400' };
  if (fulfillmentRate >= 50) return { label: 'Fair', color: 'bg-yellow-500/20 text-yellow-400' };
  return { label: 'Low', color: 'bg-red-500/20 text-red-400' };
}
