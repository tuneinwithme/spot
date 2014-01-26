exports.index = function(req, res){

    res.render('index', { title: 'listenwith.me' });
};

exports.room = function(req, res){
	var roomId = req.params.roomid;
	res.render('room', {
                "roomId" : roomId
            });

};

exports.changeRoom = function(req, res){
    console.log("catch");
    res.redirect("rooms/"+req.body.room);
}
