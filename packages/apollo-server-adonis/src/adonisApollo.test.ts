import { ioc, registrar, resolver } from '@adonisjs/fold';
import { setupResolver } from '@adonisjs/sink';
import { graphqlAdonis, graphiqlAdonis } from './adonisApollo';
import { GraphQLOptions } from 'apollo-server-core';
import { expect } from 'chai';
import testSuite, { schema as Schema, CreateAppOptions } from 'apollo-server-integration-testsuite';

// tslint:disable-next-line
const RouteStore = require('@adonisjs/framework/src/Route/Store');

function createApp(options: CreateAppOptions = {}) {
  ioc.restore();
  RouteStore.clear();
  options.graphqlOptions = options.graphqlOptions || { schema: Schema };
  const providers = [
    '@adonisjs/framework/providers/AppProvider',
  ];
  if (!options.excludeParser) {
    providers.push('@adonisjs/bodyparser/providers/BodyParserProvider');
  }
  ioc.bind('Adonis/Src/Helpers', function () {
    return {
      configPath() {
        return '.';
      },
    };
  });
  setupResolver();
  registrar
    .providers(providers)
    .register();
  ioc.bind('Adonis/Src/Config', function () {
    return {
      get(key) {
        if (key === 'app.logger.transport') {
          return 'console';
        }
        if (key === 'app.logger.console') {
          return {
            driver: 'console',
          };
        }
        if (key === 'bodyParser') {
          return {
            json: {
              limit: '1mb',
              strict: true,
              types: [
                'application/json',
                'application/json-patch+json',
                'application/vnd.api+json',
                'application/csp-report',
              ],
            },
            raw: {
              types: [
                'text/*',
              ],
            },
          };
        }
        return null;
      },
      merge(key, defaultValues) {
        const value = this.get(key, {});
        return Object.assign(value, defaultValues);
      },
    };
  });

  const Context = ioc.use('Adonis/Src/HttpContext'); // tslint:disable-line
  const Request = ioc.use('Adonis/Src/Request'); // tslint:disable-line
  const Response = ioc.use('Adonis/Src/Response'); // tslint:disable-line
  const Route = ioc.use('Adonis/Src/Route'); // tslint:disable-line
  const Server = ioc.use('Adonis/Src/Server'); // tslint:disable-line
  const Config = ioc.use('Adonis/Src/Config'); // tslint:disable-line

  Context.getter('request', function () {
    return new Request(this.req, this.res, Config);
  }, true);

  Context.getter('response', function () {
    return new Response(this.req, this.res, Config);
  }, true);

  Route.post('/graphql', graphqlAdonis(options.graphqlOptions));
  Route.get('/graphql', graphqlAdonis(options.graphqlOptions));
  if (options.graphiqlOptions) {
    Route.get('/graphiql', graphiqlAdonis(options.graphiqlOptions));
  }
  if (!options.excludeParser) {
    Server.registerGlobal(['Adonis/Middleware/BodyParser']);
  }
  Server.listen();
  return Server.getInstance();
}

function destroyApp(app) {
  app.close();
}

describe('adonisApollo', () => {
  it('throws error if called without schema', function() {
     expect(() => graphqlAdonis(undefined as GraphQLOptions)).to.throw('Apollo Server requires options.');
  });

  it('throws an error if called with more than one argument', function() {
     expect(() => (<any>graphqlAdonis)({}, 'x')).to.throw(
       'Apollo Server expects exactly one argument, got 2');
  });
});

describe('integration:Adonis', () => {
  testSuite(createApp, destroyApp);
});
