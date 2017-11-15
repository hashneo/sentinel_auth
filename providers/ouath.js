'use strict';

function ouath(app) {

    if ( !(this instanceof ouath) ){
        return new ouath(app);
    }

    const passport = require('passport');

    app.use(passport.initialize());
    app.use(passport.session());

    // serialize and deserialize
    passport.serializeUser(function(user, done) {
        done(null, user);
    });
    passport.deserializeUser(function(obj, done) {
        done(null, obj);
    });

    const request = require('request');
    const rp = require('request-promise');

    const tokens = require('../db/collections/tokens');

    var config = require('./config');
    var providers = Object.keys(config);

    providers.forEach( (provider) => {
        setupProvider( provider, config[provider] );
    });

    function setupProvider(provider, config){

        let Strategy = require(config.module).Strategy;

        passport.use(new Strategy( config.keys, (accessToken, refreshToken, profile, done) => {
                process.nextTick(function () {
                    return done(null, {profile, accessToken});
                });
            }
        ));

        app.get(`/v1/${provider}`,
            [ (req,res,next) => {
                res.cookie('redirect', req.query.redirect);
                next();
            }, passport.authenticate(provider, config.options ) ],
            (req, res) => {
            });

        app.get(`/v1/${provider}/callback`,
            passport.authenticate(provider, {failureRedirect: '/'}),
            (req, res) => {

                let profile = req.user.profile;

                let token = {
                    id: req.user.accessToken,
                    provider: provider,
                    date: new Date().toISOString(),
                    user: {id: profile.id, name: profile.displayName}
                };

                tokens.save(token)
                    .then( () => {
                        let j = request.jar();

                        var options = {
                            method: 'POST',
                            uri: 'https://koo.io/api/v1/auth/login',
                            body: {
                                studentCredentials: {
                                    socialCredentials: {
                                        provider: token.provider,
                                        token: token.id
                                    }
                                }
                            },
                            rejectUnauthorized: false,
                            json: true,
                            resolveWithFullResponse: true,
                            jar: j
                        };

                        rp(options)
                            .then( () => {
                                let cookies = j.getCookies(options.uri);
                                cookies.forEach((cookie) => {
                                    res.cookie(cookie.key, cookie.value);
                                });

                                if (req.cookies.redirect)
                                    res.redirect(req.cookies.redirect);
                            })
                            .catch( (err) => {
                                if (err.statusCode === 401) {
                                    res.status(401).json({code: 401, message: 'unauthorized'});
                                } else {
                                    res.status(500).json({code: err.code || 0, message: err.message});
                                }
                            });
                    })
                    .catch( (err) => {
                        res.status(500).json({code: err.code || 0, message: err.message});
                    });
            });
    }

};

module.exports = ouath;