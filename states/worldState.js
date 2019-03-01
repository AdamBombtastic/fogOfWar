var PLAYER = {
    speed : 2,
}
const UIMODES = {
    NONE : 0,
    PING : 1,
    EYE : 2,
}
var worldState = {
    hasView : true,
    mySprite : null,
    background: null,
    backgroundWorld: null,
    mousePos : {x: 0, y: 0},
    fogMask : null,
    playerGroup : null,
    playerSpriteMap : {},
    uiMode : UIMODES.NONE, 
    pingFollower : null,

    generateWorldGrid: function(boxDimens=32) {
        var tempGraphics = game.add.graphics(0,0);
        var width = Math.floor(game.world.width/boxDimens);
        var height = Math.floor(game.world.height/boxDimens); 
        for (var i = 0; i < width; i++) {
            for (var j = 0; j < height; j++) {
                tempGraphics.lineStyle(1,"#111111");
                tempGraphics.drawRect(i*boxDimens,j*boxDimens,boxDimens,boxDimens);
            }
        }
        var gridSprite = game.add.sprite(0,0,tempGraphics.generateTexture());
        return gridSprite;
    },
    createPingAnimation : function(x,y) {
        var pingSprite = game.add.sprite(x,y,SPRITE_KEYS.ic_ping);
        pingSprite.width= 45;
        pingSprite.height = 45;
        pingSprite.tint = 0xFF2222;
        pingSprite.centerX = x;
        pingSprite.centerY = y;
        var tempTween = game.add.tween(pingSprite).to({alpha: 0},2000,"Linear",true);
        tempTween.onComplete.add(function() {
            pingSprite.destroy();
        },this);

        console.log(pingSprite);
    },
    renderPlayers : function() {
        var players = Model.players;
        var playerSpriteMap = this.playerSpriteMap;
        var playerGroup = this.playerGroup;
        var myPlayer = Model.getMyPlayer();
        for (var i = 0; i < players.length; i++) {
            var player = players[i];
            var dimens = 64;
            if (playerSpriteMap[player.id] == null) {
                playerSpriteMap[player.id] = playerGroup.create(0,0,classIdToSpriteKey(player.playerClass));
                playerSpriteMap[player.id].textObj = game.add.text(0,0,player.name,{font: "64px Arial", fill: "#f47a42"});
                playerSpriteMap[player.id].textObj.centerX = playerSpriteMap[player.id].x;
                playerSpriteMap[player.id].textObj.centerY = playerSpriteMap[player.id].y-((dimens*2)+32);
                playerSpriteMap[player.id].addChild(playerSpriteMap[player.id].textObj);
                playerSpriteMap[player.id].width = dimens;
                playerSpriteMap[player.id].height = dimens;
                playerSpriteMap[player.id].anchor.setTo(0.5,0.5);
                playerSpriteMap[player.id].inputEnabled = true;
                playerSpriteMap[player.id].playerId = player.id;
            }
            playerSpriteMap[player.id].position.x = player.x;
            playerSpriteMap[player.id].position.y = player.y;

            playerSpriteMap[player.id].visible = myPlayer.visibilityMap[player.id] == 1;
            
            if (Model.playerId == player.id || Model.isOwner) {
                playerSpriteMap[player.id].input.enableDrag(true);
                playerSpriteMap[player.id].events.onDragStop.removeAll();
                playerSpriteMap[player.id].events.onDragStop.add(function(sprite,pointer) {
                        NetworkManager.tryMovePlayer({id:sprite.playerId,x:sprite.position.x,y:sprite.position.y});
                },this);
                playerSpriteMap[player.id].events.onInputDown.removeAll();
                playerSpriteMap[player.id].events.onInputDown.add(function(sprite,pointer) {
                    if (worldState.uiMode == UIMODES.EYE) {
                        worldState.showVisibilityDialog(sprite.playerId);
                    }
                });
                playerSpriteMap[player.id].visible = 1;
            }//player is local player
            else {
                playerSpriteMap[player.id].mask = this.fog;
            }
        }

    },
    create : function() {
        game.stage.backgroundColor = UIColors.lightGreen;
        game.stage.disableVisibilityChange = true;
        
        this.background = game.add.sprite(0,0,"map_test");
        this.background.scale.setTo(5,5);

        game.world.setBounds(0,0,this.background.width, this.background.height);
        var dimens = 64;
    
        
        this.fogMask = game.add.graphics(0,0);
        this.fogMask.beginFill(0x111111,0.3);
        this.fogMask.drawRect(0,0,this.background.width,this.background.height);

        this.fogMask = game.add.sprite(0,0,this.fogMask.generateTexture());

        this.backgroundWorld = game.add.sprite(0,0,"map_test");
        this.backgroundWorld.scale.setTo(5,5);

        var gridSprite = this.generateWorldGrid(dimens);
        
        this.playerGroup = game.add.group();
        
        this.fog = game.add.graphics(0,0);
        this.fog.beginFill(0xFFFFFF);
        this.fog.drawCircle(0,0,640);
        
        this.renderPlayers();
        NetworkManager.addObserver(this);

        this.backgroundWorld.mask = this.fog;
        /*
            All OTHER CHARACTERS MUST USE THE MASK
            this.testSprite.mask = this.fog;
        */
       //this.testSprite.mask = this.fog; 

       var ctrlKey = game.input.keyboard.addKey(Phaser.Keyboard.CONTROL);
       ctrlKey.onDown.add(function() {
            //worldState.isPingMode = !worldState.isPingMode;
            //console.log(worldState.isPingMode);
       });
       ctrlKey.onUp.add(function() {
           if (worldState.uiMode == UIMODES.PING) {
               worldState.uiMode = UIMODES.NONE;
           }
           else worldState.uiMode = UIMODES.PING;
            //console.log(worldState.isPingMode);
       },this);

       var vKey = game.input.keyboard.addKey(Phaser.Keyboard.V);
       vKey.onUp.add(function() {
            worldState.uiMode = (worldState.uiMode == UIMODES.EYE) ? UIMODES.NONE : UIMODES.EYE;
       },this);

       this.pingFollower = game.add.sprite(0,0,SPRITE_KEYS.ic_ping);
       this.pingFollower.width = 40;
       this.pingFollower.height = 40;

       this.eyeFollower = game.add.sprite(0,0,SPRITE_KEYS.ic_eye);
       this.eyeFollower.width = 40;
       this.eyeFollower.height = 40;
       this.eyeFollower.tint = 0x22BB33;

       //this.backgroundWorld.inputEnabled = true;
       //this.backgroundWorld.events.onInputDown.add(function() {
           document.onclick = function() {
            if (worldState.uiMode == UIMODES.PING){
                NetworkManager.tryPingMap({x:game.input.mousePointer.worldX,y:game.input.mousePointer.worldY});
            } //worldState.createPingAnimation(game.input.mousePointer.worldX,game.input.mousePointer.worldY);
           }
        
     
       
    },

    update : function() {
        this.mousePos = {x: game.input.mousePointer.x, y: game.input.mousePointer.y};
        this.pingFollower.alpha = worldState.uiMode == UIMODES.PING ? 1 : 0;
        this.eyeFollower.alpha = worldState.uiMode == UIMODES.EYE ? 1 : 0;
        var threshold = 8;
        if (this.mousePos.x <= threshold) {
            var diff = Math.abs(this.mousePos.x);
            game.camera.x -= diff;
        }
        else if (this.mousePos.x >= (1334-threshold)) {
            game.camera.x += Math.abs( 1334 - this.mousePos.x);
        }

        if (this.mousePos.y <= threshold) {
            game.camera.y -= Math.abs(0-this.mousePos.y);
        }
        else if (this.mousePos.y >= (750-threshold)) {
            game.camera.y += Math.abs(750-this.mousePos.y);
        }
        
        if (Model.playerId != null && this.playerSpriteMap[Model.playerId] != null) {
            this.fog.x = this.playerSpriteMap[Model.playerId].x;
            this.fog.y = this.playerSpriteMap[Model.playerId].y;
        }

        this.pingFollower.centerX = game.input.mousePointer.worldX;
        this.pingFollower.centerY = game.input.mousePointer.worldY;

        this.eyeFollower.centerX = game.input.mousePointer.worldX;
        this.eyeFollower.centerY = game.input.mousePointer.worldY;

       
    },
    NetworkUpdate : function(event, data) {
        if (!this.hasView) return;
        if (event == EVENT_TYPES.room_update) {
            if (data != null) {
                console.log(data);
                Model.players = data;
                this.renderPlayers();
            }
        }
        else if (event == EVENT_TYPES.ping_map) {
            if (data != null) {
                console.log(data);
                worldState.createPingAnimation(data.x,data.y);
            }
        }
    },
    showVisibilityDialog : function(playerId) {
        var formDiv = document.getElementById("visibilityForm");
        formDiv.hidden = false;
        var title = document.getElementById("uiFormTitle");
        const player = Model.getPlayerWithId(playerId);
        title.innerText = player.name + " can see . . .";
        var checkBoxDiv = document.getElementById("playerOptionsList")
        checkBoxDiv.innerHTML = "";
        

        for (var k in player.visibilityMap) {
            const tempId = k;
            const tempVis = player.visibilityMap[k] == 1;

            var tempPlayer = Model.getPlayerWithId(tempId);

            var ele = document.createElement("p");
            ele.innerText = tempPlayer.name;

            var check = document.createElement("input");
            check.id = "chkPlayer_"+tempId;
            check.setAttribute("type","checkbox");
            check.checked = tempVis;

            check.onchange = function(e) {
                var box = e.target;
                var checked = e.target.checked;
                player.visibilityMap[tempId] = checked ? 1 : 0;
            }

            ele.appendChild(check);

            checkBoxDiv.appendChild(ele);
        }

        var doneBtn = document.getElementById("btnFormDone");
        doneBtn.onclick = function() {
            var formDiv = document.getElementById("visibilityForm");
            formDiv.hidden=true;
            var checkBoxDiv = document.getElementById("playerOptionsList")
            checkBoxDiv.innerHTML = "";
            NetworkManager.tryUpdateVisibility({playerId:playerId,visibilityMap:player.visibilityMap});
        }

    },

}