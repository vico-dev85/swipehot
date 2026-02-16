<?php
/**
 * Plugin Name: XCam REST
 */

add_action('rest_api_init', function () {

  /* /wp-json/xcam/v1/related?tags=tattoos,teen&self=smoothnesss&gender=f */
  register_rest_route('xcam/v1', '/related', [
    'methods'  => 'GET',
    'callback' => function(WP_REST_Request $r){
        $tags = array_map('strtolower', explode(',', $r['tags'] ?? ''));
        $self = sanitize_user($r['self'] ?? '');
        $g    = strtolower($r['gender'] ?? 'f');

        $rooms = json_decode(file_get_contents(
            WP_CONTENT_DIR.'/cache/rooms_top500.json'),true)['results'] ?? [];

        $cands=[];
        foreach($rooms as $room){
          if(strtolower($room['gender']??'')!==$g) continue;
          if($room['username']===$self) continue;
          $rtags=array_map('strtolower',$room['tags']??[]);
          $over=count(array_intersect($tags,$rtags));
          if($over<1) continue;
          $cands[]=[
            'u'=>$room['username'],
            'v'=>(int)$room['num_users'],
            'o'=>$over
          ];
        }
        usort($cands,fn($a,$b)=>$b['o']<=>$a['o'] ?: $b['v']<=>$a['v']);
        return array_slice($cands,0,3);
    },
    'permission_callback'=>'__return_true',
  ]);

  /* /wp-json/xcam/v1/viewers?u=smoothnesss */
  register_rest_route('xcam/v1', '/viewers', [
    'methods'=>'GET',
    'callback'=>function(WP_REST_Request $r){
        $u=sanitize_user($r['u']??'');
        if(!$u) return new WP_REST_Response([],400);
        $rooms=json_decode(file_get_contents(
            WP_CONTENT_DIR.'/cache/rooms_top500.json'),true)['results'] ?? [];
        foreach($rooms as $room)
          if($room['username']===$u)
            return ['viewers'=>(int)$room['num_users']];
        return ['viewers'=>0];
    },
    'permission_callback'=>'__return_true',
  ]);
});
