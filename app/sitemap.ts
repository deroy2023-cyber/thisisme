import type { MetadataRoute } from 'next'

/* One-page site: the home route is the only indexable URL. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://atwostudios.com/',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
