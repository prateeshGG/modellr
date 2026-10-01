import { UseCasePage } from './UseCasePage';

export function EcommerceSchema() {
  return (
    <UseCasePage
      data={{
        path: '/use-cases/ecommerce-schema',
        eyebrow: 'Example · E-commerce',
        h1: 'An e-commerce database schema.',
        lead: 'The built-in E-commerce template has users, products, orders and order items. Add variants, carts and payments on the canvas.',
        templateId: 'ecommerce',
        challengeTitle: 'E-commerce systems get complex fast.',
        challengeIntro: 'Even simple stores require:',
        challenge: ['Product catalogs', 'Inventory tracking', 'Carts and orders', 'Payments and refunds'],
        tables: [
          { name: 'Users', desc: 'Customer accounts.' },
          { name: 'Products', desc: 'Product details.' },
          { name: 'Product variants', desc: 'Sizes, colours, SKUs.' },
          { name: 'Carts and orders', desc: 'Temporary selections converting into finalized purchases.' },
          { name: 'Payments', desc: 'Payment transactions linked to orders.' },
        ],
        relationships: ['Users create carts', 'Carts convert into orders', 'Orders contain multiple products', 'Payments are linked to orders'],
        closingTitle: 'Start from a clear structure',
        closingBody: 'Poor schema design leads to inconsistent orders, inventory bugs and payment mismatches.',
        ctaTitle: 'Start your store schema from a template.',
      }}
    />
  );
}
