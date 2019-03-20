var MapManager = {
    maps : [],
    createMap :function(name,fileName,key,width,height,gridSize) {
        MapManager.maps.push({name: name,fileName: fileName, key:key, width : width, height: height, gridSize: gridSize});
        return MapManager.maps[MapManager.length-1];
    }
}


//Add a Map here
MapManager.createMap("Test Map","/graphics/map_test.jpg","test_map",526*5,306*5,64);
MapManager.createMap("Other Map","/graphics/other_map.jpg","other_map",526*5,306*5,64);