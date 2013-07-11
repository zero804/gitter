var users = db.users.find({email:/troupetest.local/});
var u;
users.forEach(function(user) {
    u = user._id;
    s = u.toString();
    print(s.substring(10,34));

});