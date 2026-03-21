import * as esbuild from 'esbuild'
import { rimraf } from 'rimraf'
import stylePlugin from 'esbuild-style-plugin'
import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

const args = process.argv.slice(2)
const isProd = args.includes('--production')

await rimraf('dist')
mkdirSync('dist', { recursive: true })

/**
 * @type {esbuild.BuildOptions}
 */
const esbuildOpts = {
  color: true,
  entryPoints: ['src/main.tsx'],
  outdir: 'dist',
  entryNames: 'main',
  assetNames: 'assets/[name]-[hash]',
  write: true,
  bundle: true,
  format: 'iife',
  sourcemap: isProd ? false : 'linked',
  minify: isProd,
  treeShaking: true,
  jsx: 'automatic',
  loader: {
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.svg': 'file',
    '.webp': 'file',
    '.gif': 'file',
    '.woff': 'file',
    '.woff2': 'file',
    '.ttf': 'file',
    '.eot': 'file',
  },
  plugins: [
    stylePlugin({
      postcss: {
        plugins: [tailwindcss, autoprefixer],
      },
    }),
  ],
}

const copyStaticFiles = () => {
  if (existsSync('index.html')) {
    copyFileSync('index.html', 'dist/index.html')
  } else {
    throw new Error('No se encontró index.html en la raíz del proyecto')
  }
}

if (isProd) {
  await esbuild.build(esbuildOpts)
  copyStaticFiles()
} else {
  const ctx = await esbuild.context(esbuildOpts)
  await ctx.watch()
  const { hosts, port } = await ctx.serve({
    servedir: 'dist',
  })
  copyStaticFiles()
  console.log(`Running on:`)
  hosts.forEach((host) => {
    console.log(`http://${host}:${port}`)
  })
}
