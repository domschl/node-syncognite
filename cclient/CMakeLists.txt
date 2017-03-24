cmake_minimum_required(VERSION 2.8.11)

set(CMAKE_BUILD_TYPE Release)
include_directories("/usr/local/include")
project(evcclient)

add_subdirectory (evcclient)
add_subdirectory (evcdemo)
