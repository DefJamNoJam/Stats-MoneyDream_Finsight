module.exports = {
  style: {
    postcss: {
      plugins: [
        require('tailwindcss')({ important: true }),
        require('autoprefixer'),
      ],
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.ignoreWarnings = [
        {
          module: /node_modules\/plotly\.js/,
          message: /Failed to parse source map/,
        },
      ];
      
      // fallback 설정 추가 (https 및 querystring)
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        https: require.resolve('https-browserify'),
        querystring: require.resolve('querystring-es3'),
      };

      return webpackConfig;
    },
  },
};
