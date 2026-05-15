import Hero from "./components/Hero";
import GalleryCarousel from "./components/GalleryCarousel";


import FeaturedStrip from "./components/FeaturedStrip";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";
import { galleryItems, faqItems } from "./data/gallery";

export default function Home() {
  // JSON-LD: ItemList
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "MapVibe City Map Art Collection",
    description:
      "Curated city map art prints for luxury interiors, Scandinavian spaces, and thoughtful gifting.",
    url: "https://mapvibe.co",
    numberOfItems: galleryItems.length,
    itemListElement: galleryItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://mapvibe.co/#${item.anchor}`,
      name: item.title,
      image: item.imageUrl,
      description: item.description,
    })),
  };

  // JSON-LD: Products
  const productSchemas = galleryItems.map((item) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.title,
    description: item.description,
    image: item.imageUrl,
    sku: item.id,
    brand: {
      "@type": "Brand",
      name: "MapVibe",
    },
    category: `${item.theme} — ${item.occasion}`,
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      priceCurrency: "USD",
      seller: {
        "@type": "Organization",
        name: "MapVibe",
      },
    },
  }));

  // JSON-LD: FAQ
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  // JSON-LD: Organization
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MapVibe",
    url: "https://mapvibe.co",
    logo: "https://mapvibe.co/logo.png",
    description:
      "Premium city map art prints for modern interiors and thoughtful gifting.",
    sameAs: [
      "https://instagram.com/mapvibe",
      "https://pinterest.com/mapvibe",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "hello@mapvibe.co",
      contactType: "customer support",
    },
  };

  // JSON-LD: WebSite
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MapVibe",
    url: "https://mapvibe.co",
    description:
      "Curated city map art prints for luxury interiors and thoughtful gifting.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://mapvibe.co/#gallery?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      {/* Structured data — all JSON-LD scripts */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      {productSchemas.map((schema) => (
        <script
          key={schema.sku}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Page sections */}
      <main>
        <Hero />

        <GalleryCarousel />
        <FeaturedStrip />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
