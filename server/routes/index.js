exports.index = function(req, res){

    res.render('index', { title: 'liveDJ' });
};

exports.room = function(req, res){
	var roomId = req.params.roomid;
	res.render('room', {
                "roomId" : roomId
            });
	
};
