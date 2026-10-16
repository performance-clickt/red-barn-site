import { config, fields, collection, singleton } from '@keystatic/core';
const image = (label: string, bucket = 'homepage') => fields.image({ label, directory: `public/images/${bucket}`, publicPath: `/images/${bucket}/` });
const text = (label: string) => fields.text({ label, validation: { isRequired: true } });
const base = (bucket: string) => ({
  title: fields.slug({ name: { label: 'Page title' } }),
  seoTitle: fields.text({ label: 'SEO title' }),
  h1: fields.text({ label: 'Main heading' }),
  description: fields.text({ label: 'Search description', multiline: true }),
  heroImage: image('Lead image', bucket), heroAlt: fields.text({ label: 'Image description' }),
  sourceUrl: fields.url({ label: 'Original source (migration reference)' }),
  content: fields.markdoc({ label: 'Page content', options: { image: { directory: `public/images/${bucket}`, publicPath: `/images/${bucket}/` } } }),
});
export default config({
  storage: { kind: 'local' },
  ui: { brand: { name: 'Red Barn · Content' } },
  singletons: {
    insights: singleton({ label: 'Insights listing', path: 'src/content/insights', format: { data: 'json' }, schema: {
      seoTitle: text('SEO title'), description: text('Search description'), h1: text('Main heading'),
    }}),
    homepage: singleton({ label: 'Homepage', path: 'src/content/homepage', format: { data: 'json' }, schema: {
      headline: text('Opening headline'), tagline: text('Opening description'),
      seoTitle: text('SEO title'), seoDescription: text('Search description'), seoContext: text('Introduction context'),
      intro: fields.text({ label: 'Who we are', multiline: true }),
      gallery: fields.array(fields.object({ image: image('Photo'), alt: text('Photo description') }), { label: 'Hero gallery (five photos)', itemLabel: props => props.fields.alt.value, validation: { length: { min: 5, max: 5 } } }),
      differences: fields.array(fields.object({ title: text('Title'), body: fields.text({ label: 'Description', multiline: true }) }), { label: 'The Red Barn difference', itemLabel: props => props.fields.title.value }),
      familyTitle: text('Family section title'), familyBody: fields.text({ label: 'Family section text', multiline: true }),
      familyTakeaways: fields.array(text('Takeaway'), { label: 'Family meeting takeaways', itemLabel: props => props.value }),
      investingTitle: text('Investing heading'), investingBody: fields.text({ label: 'Investing description', multiline: true }),
      pillars: fields.array(text('Pillar'), { label: 'Investment pillars', itemLabel: props => props.value }),
      steps: fields.array(fields.object({ title: text('Stage'), body: fields.text({ label: 'Description', multiline: true }) }), { label: 'First 90 days', itemLabel: props => props.fields.title.value }),
      quizTitle: text('Quiz title'), quizBody: fields.text({ label: 'Quiz description', multiline: true }),
      quizBenefits: fields.array(text('Benefit'), { label: 'Quiz benefits', itemLabel: props => props.value }),
      advisorBody: fields.text({ label: 'Advisor invitation', multiline: true }),
    }}),
    settings: singleton({ label: 'Contact & site settings', path: 'src/content/settings', format: { data: 'json' }, schema: {
      email: text('Contact email'), phone: text('Phone'), address: fields.text({ label: 'Address', multiline: true }),
      disclosure: fields.text({ label: 'Regulatory disclosure', multiline: true }),
      riskDisclosure: fields.text({ label: 'Investment risk disclosure', multiline: true }),
      subscriptionConsent: fields.text({ label: 'Subscription consent', multiline: true }),
      quizUrl: fields.url({ label: 'Financial values quiz URL' }),
      roadmapUrl: fields.url({ label: 'Financial freedom roadmap URL' }),
      conflictsUrl: fields.url({ label: 'Conflicts of interest document' }),
    }}),
  },
  collections: {
    pages: collection({ label: 'Website pages', slugField: 'title', path: 'src/content/pages/*', format: { contentField: 'content' }, schema: base('pages') }),
    posts: collection({ label: 'Insights', slugField: 'title', path: 'src/content/posts/*', format: { contentField: 'content' }, schema: { ...base('posts'), date: fields.date({ label: 'Publication date' }), author: text('Author') } }),
  },
});
