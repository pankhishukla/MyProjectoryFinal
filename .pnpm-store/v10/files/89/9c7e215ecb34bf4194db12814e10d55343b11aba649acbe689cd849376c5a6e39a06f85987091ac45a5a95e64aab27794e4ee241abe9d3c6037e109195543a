/**
 * Created by caoxp on 15-8-5.
 */

var mysql = require('mysql');
var config = require('../config/sys.config.js');
var util = require('util');

var pool = mysql.createPool({
    connectionLimit:4,
    host:config.mysqlconn.host,
    port:config.mysqlconn.port,
    user:config.mysqlconn.user,
    password:config.mysqlconn.password,
    database:config.mysqlconn.database,
    charset:'utf8'
});
var handleError = function (err) {
    if(err.code === 'PROTOCOL_CONNECTION_LOST'){
        //连接丢失

    }
};
var queryTimeout = 1000*60*3;

exports.mysqlhelper = {
    query:function(sql,cb){
        if(!sql){
            console.log('query方法中参数sql为空');
            cb(new Error('query方法中参数sql为空'));
            return;
        }else{
            try{
                pool.getConnection(function(err,connection){
                    if(err){
                        return cb(err);
                    }
                    connection.query({sql:sql,timeout:queryTimeout}, function (e,result) {
                      cb(e,result);
                        connection.release();
                    })
                });
            }catch(er){
                cb(er);

            }
        }

    },
    queryPageCount:function(sql,cb){
        if(!sql){
            console.log('queryPageCount方法中参数sql为空');
            cb(new Error('queryPageCount方法中参数sql为空'));
            return;
        }
        sql = util.format('select count(1) count from (%s) A',sql);
        this.query(sql,cb);
    },
    queryPage:function(sql,primarykey,page,rowSize,cb){
        if(!sql){
            console.log('queryPage方法中参数sql为空');
            cb(new Error('queryPage方法中参数sql为空'));
            return;
        }
        sql = util.format('%s limit %d,%d',sql,(page-1)*rowSize,rowSize);
        //TODO:优化分页性能
        ////100页之前使用基本分页
        //if(page<100){
        //    sql = util.format('%s limit %d %d',sql,(page-1)*rowSize,rowSize);
        //}else{
        //    //如果有key
        //    if(primarykey){
        //
        //        sql = util.format('')
        //    }else{
        //        sql = util.format('%s limit %d %d',sql,(page-1)*rowSize,rowSize);
        //    }
        //}
       this.query(sql,cb);


    },
    queryNoRecord: function (sql,cb) {
        if(!sql){
            console.log('query方法中参数sql为空');
            cb(new Error('query方法中参数sql为空'));
            return;
        }else{
            try{
                pool.getConnection(function(err,connection){
                    if(err){
                        return cb(err);
                    }
                    connection.query({sql:sql,timeout:queryTimeout}, function (e,result) {
                        cb(e,result.affectedRows);
                        connection.release();
                    })
                });
            }catch(er){
                cb(er);

            }
        }
    },
    queryTransaction: function (sqls, cb) {
        if(!sqls){
            console.log('queryTransaction方法中参数sql为空');
            callback(new Error('queryTransaction方法中参数sql为空'));return;
        }
        try{
            pool.getConnection(function(err,connection){
                if(err){
                    return cb(err);
                }
                connection.beginTransaction(function (err) {
                    if(err){
                        return cb(err);
                    }
                    sqls.forEach(function(sql,idx){
                        connection.query({sql:sql,timeout:queryTimeout},function(er,result){
                            if(err){
                                return connection.rollback(function () {
                                    cb(err);
                                })
                            }
                        })
                        if(idx == sqls.length){
                            connection.commit(function (cer) {
                                if(cer){
                                    return connection.rollback(function(){
                                        cb(cer);
                                    })
                                }
                            })
                        }
                    })
                });
            });
        }catch(er){
            cb(er);

        }

    }
}