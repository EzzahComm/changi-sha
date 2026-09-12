/**
 * Campaign Metadata Generator for SEO and Social Sharing
 * Generates Open Graph tags, Twitter cards, and other meta information
 */

export interface CampaignMetadata {
  title: string;
  description: string;
  image: string;
  url: string;
  campaignName: string;
  targetAmount: number;
  raised: number;
  beneficiaryName: string;
}

/**
 * Generate meta tags for social sharing
 * Used by Next.js generateMetadata() in layout/page files
 */
export function generateCampaignMetadata(campaign: CampaignMetadata) {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://changisha.kitabuyetu.co.ke';
  const canonicalUrl = `${baseUrl}${campaign.url}`;

  const progress = Math.min((campaign.raised / campaign.targetAmount) * 100, 100);
  const shortDescription = campaign.description.substring(0, 155);

  return {
    title: campaign.title,
    description: shortDescription,
    openGraph: {
      title: campaign.campaignName,
      description: shortDescription,
      url: canonicalUrl,
      type: 'website',
      images: [
        {
          url: campaign.image,
          width: 1200,
          height: 630,
          alt: campaign.campaignName,
        },
      ],
      siteName: 'Changisha',
    },
    twitter: {
      card: 'summary_large_image',
      title: campaign.campaignName,
      description: `${Math.round(progress)}% funded on Changisha`,
      images: [campaign.image],
      creator: '@Changisha',
    },
    canonical: canonicalUrl,
  };
}

/**
 * Generate SMS share text for Kenyan context
 * Uses Swahili-friendly template
 */
export function generateSMSShareText(campaign: {
  campaignName: string;
  targetAmount: number;
  raised: number;
}): string {
  const progress = Math.min(
    (campaign.raised / campaign.targetAmount) * 100,
    100
  );

  return (
    `Karibu kusaidia ${campaign.campaignName} kupitia Changisha!\n` +
    `Lengo: KES ${campaign.targetAmount.toLocaleString()}\n` +
    `Kumpeuzi: ${Math.round(progress)}%\n` +
    `Jiunge na wengine wanaosaidia`
  );
}

/**
 * Generate WhatsApp share text
 * Optimized for group sharing
 */
export function generateWhatsAppShareText(campaign: {
  campaignName: string;
  targetAmount: number;
  raised: number;
  url: string;
}): string {
  const progress = Math.min(
    (campaign.raised / campaign.targetAmount) * 100,
    100
  );

  return (
    `*${campaign.campaignName}*\n\n` +
    `Goal: KES ${campaign.targetAmount.toLocaleString()}\n` +
    `Funded: ${Math.round(progress)}%\n` +
    `Platform: Changisha (Modern Fundraising for Chamas)\n\n` +
    `Pledge and pay via M-Pesa:\n` +
    `${campaign.url}\n\n` +
    `🤝 Harambee!`
  );
}

/**
 * Generate QR code URL for campaign
 * Uses qr-server API (free, no auth required)
 */
export function generateQRCodeUrl(campaignUrl: string): string {
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/';
  const params = new URLSearchParams({
    size: '300x300',
    data: campaignUrl,
    format: 'png',
  });
  return `${qrUrl}?${params.toString()}`;
}

/**
 * Generate structured data for Google Rich Snippets
 * Helps search engines understand the campaign
 */
export function generateStructuredData(campaign: {
  campaignName: string;
  description: string;
  targetAmount: number;
  raised: number;
  image: string;
  url: string;
  beneficiaryName: string;
  createdAt: string;
}): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FundingEvent',
    name: campaign.campaignName,
    description: campaign.description,
    image: campaign.image,
    url: campaign.url,
    startDate: campaign.createdAt,
    funder: {
      '@type': 'Organization',
      name: 'Changisha',
      url: 'https://changisha.kitabuyetu.co.ke',
    },
    recipient: {
      '@type': 'Organization',
      name: campaign.beneficiaryName,
    },
    fundingTarget: {
      '@type': 'PriceSpecification',
      priceCurrency: 'KES',
      price: campaign.targetAmount.toString(),
    },
    fundingCurrent: {
      '@type': 'PriceSpecification',
      priceCurrency: 'KES',
      price: campaign.raised.toString(),
    },
  };
}

/**
 * Create a shareable campaign link with UTM parameters
 * Helps track where pledges come from
 */
export function generateShareLink(
  campaignUrl: string,
  source: 'whatsapp' | 'twitter' | 'facebook' | 'email' | 'sms',
  medium: 'social' | 'email' | 'sms' = source === 'email' ? 'email' : source === 'sms' ? 'sms' : 'social'
): string {
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: medium,
    utm_campaign: 'share',
  });

  return `${campaignUrl}?${params.toString()}`;
}
