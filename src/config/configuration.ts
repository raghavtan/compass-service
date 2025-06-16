export default () => ({
  compass: {
    baseUrl: process.env.COMPASS_HOST,
    apiToken: process.env.COMPASS_API_TOKEN,
    cloudId: process.env.COMPASS_CLOUD_ID,
    graphqlEndpoint: `${process.env.COMPASS_HOST}/gateway/api/graphql`,
  },
  port: parseInt(process.env.PORT || '3000', 10) || 3000,
});
