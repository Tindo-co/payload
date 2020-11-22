import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import webpack, { Configuration } from 'webpack';
import MiniCSSExtractPlugin from 'mini-css-extract-plugin';
import { Config } from '../config/types';
import babelConfig from '../babel.config';

const mockModulePath = path.resolve(__dirname, './mocks/emptyModule.js');

export default (config: Config): Configuration => {
  let webpackConfig: Configuration = {
    entry: {
      main: [
        'webpack-hot-middleware/client',
        path.resolve(__dirname, '../admin'),
      ],
    },
    output: {
      path: '/',
      publicPath: config.routes.admin,
      filename: '[name].js',
    },
    devtool: 'inline-source-map',
    mode: 'development',
    resolveLoader: {
      modules: ['node_modules', path.join(__dirname, '../../node_modules')],
    },
    module: {
      rules: [
        {
          test: /\.(t|j)sx?$/,
          exclude: /node_modules[\\/](?!(@payloadcms[\\/]payload)[\\/]).*/,
          use: [
            {
              loader: 'babel-loader',
              options: babelConfig({ env: () => false }),
            },
          ],
        },
        {
          oneOf: [
            {
              test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
              loader: require.resolve('url-loader'),
              options: {
                limit: 10000,
                name: 'static/media/[name].[hash:8].[ext]',
              },
            },
            {
              test: /\.(sa|sc|c)ss$/,
              use: [
                MiniCSSExtractPlugin.loader,
                'css-loader',
                {
                  loader: 'postcss-loader',
                  options: {
                    postcssOptions: {
                      plugins: ['postcss-preset-env'],
                    },
                  },
                },
                'sass-loader',
              ],
            },
            {
              exclude: [/\.((t|j)s|(t|j)sx|mjs)$/, /\.html$/, /\.json$/],
              loader: require.resolve('file-loader'),
              options: {
                name: 'static/media/[name].[hash:8].[ext]',
              },
            },
          ],
        },
      ],
    },
    resolve: {
      modules: ['node_modules', path.resolve(__dirname, '../../node_modules')],
      alias: {
        'payload/unsanitizedConfig': config.paths.config,
        '@payloadcms/payload$': mockModulePath,
      },
      extensions: ['.ts', '.tsx', '.js', '.json'],
    },
    plugins: [
      new webpack.DefinePlugin(
        Object.entries(config.publicENV).reduce(
          (values, [key, val]) => ({
            ...values,
            [`process.env.${key}`]: `'${val}'`,
          }),
          {},
        ),
      ),
      new HtmlWebpackPlugin({
        template:
          config.admin && config.admin.indexHTML
            ? path.join(config.paths.configDir, config.admin.indexHTML)
            : path.resolve(__dirname, '../admin/index.html'),
        filename: './index.html',
      }),
      new webpack.HotModuleReplacementPlugin(),
      new MiniCSSExtractPlugin({
        ignoreOrder: true,
      }),
    ],
  };

  if (Array.isArray(config.serverModules)) {
    config.serverModules.forEach((mod) => {
      webpackConfig.resolve.alias[mod] = mockModulePath;
    });
  }

  if (config.paths.scss) {
    const overridePath = path.join(config.paths.configDir, config.paths.scss);
    webpackConfig.resolve.alias['payload-scss-overrides'] = overridePath;
  } else {
    webpackConfig.resolve.alias['payload-scss-overrides'] = path.resolve(__dirname, '../admin/scss/overrides.scss');
  }

  if (config.webpack && typeof config.webpack === 'function') {
    webpackConfig = config.webpack(webpackConfig);
  }

  return webpackConfig;
};