<?php
// logout.php - Business owner logout
require_once 'config.php';
require_once 'User.php';

$userObj = new User();
$userObj->logout();

header('Location: login.php');
exit;
