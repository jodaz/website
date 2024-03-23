/* @ref: https://github.com/garmeeh/next-seo */

const title = 'Jesus Ordosgoitty'
const defaultTitle = `${title} - Software Developer`
const description = "Hi!, my name is Jesus Ordosgoitty, a 98' born guy full-stack software developer from Venezuela venezuelaHi!, my name is Jesus Ordosgoitty, a 98' born guy full-stack software developer from Venezuela"
const url = 'https://jodaz.dev'
const ogImageUrl = '/images/og.png'
const keywords =
	'ordosgoitty, jodaz, jesus, jesus ordosgoitty, portfolio, javascript, typescript, developer, software engineer, frontend, front-end, venezuela, caribe, fullstack, full-stack, full stack, mobile, react, react native, native'

const seo = {
	titleTemplate: `%s – ${title}`,
	defaultTitle,
	description,
	openGraph: {
		description,
		title,
		locale: 'en_US',
		type: 'website',
		url,
		canonical: url,
		images: [
			{
				url: ogImageUrl,
				width: 800,
				height: 600,
				alt: title
			}
		]
	},
	additionalMetaTags: [
		{
			name: 'keywords',
			content: keywords
		},
		{
			name: 'theme-color',
			content: '#333333'
		},
		{
			name: 'referer',
			content: 'strict-origin'
		}
	],
	additionalLinkTags: [
		{
			rel: 'icon',
			type: 'image/x-icon',
			href: '/favicon.ico?v=3'
		},
		{
			rel: 'shortcut icon',
			type: 'image/x-icon',
			href: '/favicon.ico?v=3'
		},
		{
			rel: 'icon',
			type: 'image/png',
			href: '/favicon-16x16.png?v=3',
			sizes: '16x16'
		},
		{
			rel: 'icon',
			type: 'image/png',
			href: '/favicon-32x32.png?v=3',
			sizes: '32x32'
		},
		{
			rel: 'apple-touch-icon',
			href: '/apple-touch-icon.png?v=3'
		},
		{
			rel: 'manifest',
			href: '/manifest.json'
		}
	]
}

export {
    seo as defaultSeo,
    url as defaultUrl,
    title as defaultTitle
}
export default seo
