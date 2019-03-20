var SPRITE_KEYS = {
    ic_bard : "ic_bard",
    ic_barbarian : "ic_barbarian",
    ic_cleric :"ic_cleric",
    ic_druid : "ic_druid",
    ic_fighter : "ic_fighter",
    ic_monk : "ic_monk",
    ic_paladin :"ic_paladin",
    ic_ranger : "ic_ranger",
    ic_rogue : "ic_rogue",
    ic_sorcerer : "ic_sorcerer",
    ic_warlock : "ic_warlock",
    ic_wizard : "ic_wizard",
    ic_ping : "ic_ping",
    ic_eye : "ic_eye",
    map_test : "map_test",
}
function classIdToSpriteKey(id) {
    //Should've just mapped them -- But whatever.
    switch (id) {
        case 0:
            return SPRITE_KEYS.ic_bard;
        case 1:
            return SPRITE_KEYS.ic_barbarian;
        case 2:
            return SPRITE_KEYS.ic_cleric;
        case 3:
            return SPRITE_KEYS.ic_druid;
        case 4:
            return SPRITE_KEYS.ic_fighter;
        case 5:
            return SPRITE_KEYS.ic_monk;
        case 6:
            return SPRITE_KEYS.ic_paladin;
        case 7:
            return SPRITE_KEYS.ic_ranger;
        case 8:
            return SPRITE_KEYS.ic_rogue;
        case 9:
            return SPRITE_KEYS.ic_sorcerer;
        case 10:
            return SPRITE_KEYS.ic_warlock;
        case 11:
            return SPRITE_KEYS.ic_wizard;
        default:
            return SPRITE_KEYS.ic_bard;
    }
}
function classIdToImagePath(id) {
    var key = classIdToSpriteKey(id);
    return "./graphics/"+key+".png";
}
var loadState =  {
    loadingLabel : null,
    hasView:true,
    preload: function() {
        loadingLabel = game.add.text(10,10,"Loading Game Assets . . .", {font: "50px Arial", fill: "White"});
        
        //Progress
        game.load.onFileComplete.add( function (progress) {
            loadingLabel.text = "Loading Game Assets: " + progress + "%";
        },this);
        game.load.onLoadComplete.add(function (progress) {
            loadingLabel.text = "Done!";
        },this);

        for (var i = 0; i < MapManager.maps.length; i++) {
            var tempMap = MapManager.maps[i];
            game.load.image(tempMap.key,tempMap.fileName);
        }

        //TODO: Generify this for when we allow uploaded tokens.
        game.load.image("ic_bard", "./graphics/ic_bard.png");
        game.load.image("ic_barbarian", "./graphics/ic_barbarian.png");
        game.load.image("ic_cleric", "./graphics/ic_cleric.png");
        game.load.image("ic_druid", "./graphics/ic_druid.png");
        game.load.image("ic_fighter", "./graphics/ic_fighter.png");
        game.load.image("ic_monk", "./graphics/ic_monk.png");
        game.load.image("ic_paladin", "./graphics/ic_paladin.png");
        game.load.image("ic_ranger", "./graphics/ic_ranger.png");
        game.load.image("ic_rogue", "./graphics/ic_rogue.png");
        game.load.image("ic_sorcerer", "./graphics/ic_sorcerer.png");
        game.load.image("ic_warlock", "./graphics/ic_warlock.png");
        game.load.image("ic_wizard", "./graphics/ic_bard.png");
        game.load.image("map_test","/graphics/map_test.jpg");
        game.load.image("ic_ping","/graphics/ic_ping.png");
        game.load.image("ic_eye","/graphics/ic_eye.png");

    },
        
    create: function() {
        loadingLabel.text = "Connecting to server . . .";
        NetworkManager.addObserver(this);
        NetworkManager.tryUpdateRoom();
        //
    },
    NetworkUpdate : function(event,data) {
        if (!this.hasView) return;
        if (event == EVENT_TYPES.room_update) {
            if (data != null) {
                Model.players = data;
                this.hasView = false;
                updateInfoBar(Model.getMyPlayer().name + (Model.isOwner ? " - (Owner) " : ""),classIdToImagePath(Model.getMyPlayer().playerClass),Model.roomCode);
                NavigationManager.pushState("world",{},false);
            }
        }
    }
}