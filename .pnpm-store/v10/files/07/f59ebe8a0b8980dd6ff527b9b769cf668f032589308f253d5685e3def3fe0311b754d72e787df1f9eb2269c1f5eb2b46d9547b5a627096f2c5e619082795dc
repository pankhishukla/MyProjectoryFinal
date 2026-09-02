/**
 * Created by caoxp on 2015/6/16.
 * restful服务主入口
 */

var restful = require('restify');

var sysconfig = require('./config/sys.config');
var controller = require('./routes/routeAdapter');
var sqls = require('./core/sqljson');

var server = restful.createServer({
name:sysconfig.name
});

server.use(restful.acceptParser(server.acceptable));
server.use(restful.queryParser());
server.use(restful.urlEncodedBodyParser());
sqls.sqlInfo.load();

controller(server);
server.listen(sysconfig.port,sysconfig.ip,function(){
    console.log('Restful Server is Openen at %s:%s',sysconfig.ip,sysconfig.port);
})
